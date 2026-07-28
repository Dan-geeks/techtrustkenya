-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('customer', 'vendor', 'admin');
CREATE TYPE public.product_category AS ENUM ('laptop', 'smartphone', 'accessory', 'spare_part');
CREATE TYPE public.product_condition AS ENUM ('new', 'refurbished', 'used');
CREATE TYPE public.order_status AS ENUM (
  'pending_payment','payment_held','vendor_preparing','out_for_delivery',
  'ready_for_pickup','delivered_awaiting_confirmation','confirmed',
  'disputed','refunded','cancelled'
);
CREATE TYPE public.vendor_verification_status AS ENUM ('pending','verified','suspended');
CREATE TYPE public.subscription_tier AS ENUM ('basic','standard','premium');
CREATE TYPE public.device_type AS ENUM ('laptop','smartphone','both');
CREATE TYPE public.repair_status AS ENUM (
  'submitted','received','diagnosing','in_repair','ready_for_collection','completed','cancelled'
);
CREATE TYPE public.repair_payment_status AS ENUM ('unpaid','held','released');
CREATE TYPE public.spare_part_status AS ENUM ('pending','approved_by_customer','ordered','delivered');
CREATE TYPE public.promotion_type AS ENUM ('featured_homepage','top_search','trending_carousel');
CREATE TYPE public.notification_type AS ENUM ('order_update','payment','repair_update','review_request','promotion','dispute');

-- ============ UTIL FN ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone_number TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(),'admin'));

-- ============ VENDOR PROFILES ============
CREATE TABLE public.vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  physical_address TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  operating_hours TEXT,
  id_document_url TEXT,
  business_certificate_url TEXT,
  shop_photo_urls TEXT[] DEFAULT '{}',
  verification_status vendor_verification_status NOT NULL DEFAULT 'pending',
  total_completed_transactions INT NOT NULL DEFAULT 0,
  average_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  subscription_tier subscription_tier NOT NULL DEFAULT 'basic',
  subscription_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verified vendors public" ON public.vendor_profiles FOR SELECT USING (verification_status = 'verified' OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Vendor manages own profile" ON public.vendor_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin manages vendor profiles" ON public.vendor_profiles FOR ALL USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_vendor_profiles_updated BEFORE UPDATE ON public.vendor_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PRODUCTS ============
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  category product_category NOT NULL,
  brand TEXT NOT NULL,
  model_name TEXT NOT NULL,
  year_of_manufacture INT,
  condition product_condition NOT NULL,
  price_ksh INT NOT NULL CHECK (price_ksh >= 500),
  quantity_in_stock INT NOT NULL DEFAULT 0 CHECK (quantity_in_stock >= 0),
  warranty_status BOOLEAN NOT NULL DEFAULT false,
  warranty_duration_months INT,
  description TEXT,
  image_urls TEXT[] DEFAULT '{}',
  video_url TEXT,
  is_boosted BOOLEAN NOT NULL DEFAULT false,
  boost_expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  average_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active products public" ON public.products FOR SELECT USING (is_active = true OR vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Vendor manages own products" ON public.products FOR ALL USING (vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid())) WITH CHECK (vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid()));
CREATE INDEX idx_products_vendor ON public.products(vendor_id);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_boosted ON public.products(is_boosted, boost_expires_at);
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ ORDERS ============
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  total_amount_ksh INT NOT NULL,
  platform_fee_ksh INT NOT NULL,
  vendor_payout_ksh INT NOT NULL,
  status order_status NOT NULL DEFAULT 'pending_payment',
  mpesa_transaction_id TEXT,
  float_released_at TIMESTAMPTZ,
  dispute_reason TEXT,
  confirmation_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer view own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Vendor view own orders" ON public.orders FOR SELECT USING (vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Customer create orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customer update own orders" ON public.orders FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Vendor update own orders" ON public.orders FOR UPDATE USING (vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid()));
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REVIEWS ============
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  product_rating INT NOT NULL CHECK (product_rating BETWEEN 1 AND 5),
  service_rating INT NOT NULL CHECK (service_rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reviews public" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "Customer create review for own confirmed order" ON public.reviews FOR INSERT WITH CHECK (
  auth.uid() = customer_id AND
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.customer_id = auth.uid() AND o.status = 'confirmed')
);

-- ============ REPAIR SERVICES ============
CREATE TABLE public.repair_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  device_type device_type NOT NULL,
  description TEXT,
  price_min_ksh INT NOT NULL,
  price_max_ksh INT NOT NULL,
  estimated_turnaround_days INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Repair services public" ON public.repair_services FOR SELECT USING (is_active = true);
CREATE POLICY "Vendor manages own repair services" ON public.repair_services FOR ALL USING (vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid())) WITH CHECK (vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid()));

-- ============ REPAIR REQUESTS ============
CREATE TABLE public.repair_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id),
  repair_service_id UUID REFERENCES public.repair_services(id),
  device_description TEXT NOT NULL,
  problem_description TEXT NOT NULL,
  status repair_status NOT NULL DEFAULT 'submitted',
  quoted_price_ksh INT,
  customer_approved_quote BOOLEAN NOT NULL DEFAULT false,
  payment_status repair_payment_status NOT NULL DEFAULT 'unpaid',
  mpesa_transaction_id TEXT,
  technician_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.repair_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer view own repairs" ON public.repair_requests FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Vendor view own repairs" ON public.repair_requests FOR SELECT USING (vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Customer create repair request" ON public.repair_requests FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customer update own repair" ON public.repair_requests FOR UPDATE USING (auth.uid() = customer_id);
CREATE POLICY "Vendor update assigned repair" ON public.repair_requests FOR UPDATE USING (vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid()));
CREATE TRIGGER trg_repair_updated BEFORE UPDATE ON public.repair_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ SPARE PART ORDERS ============
CREATE TABLE public.spare_part_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_request_id UUID NOT NULL REFERENCES public.repair_requests(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  price_ksh INT NOT NULL,
  status spare_part_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.spare_part_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customer view own spare parts" ON public.spare_part_orders FOR SELECT USING (
  repair_request_id IN (SELECT id FROM public.repair_requests WHERE customer_id = auth.uid())
);
CREATE POLICY "Vendor view spare parts on own repair" ON public.spare_part_orders FOR SELECT USING (
  repair_request_id IN (SELECT id FROM public.repair_requests WHERE vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "Vendor add spare parts" ON public.spare_part_orders FOR INSERT WITH CHECK (
  repair_request_id IN (SELECT id FROM public.repair_requests WHERE vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid()))
);
CREATE POLICY "Customer approve spare parts" ON public.spare_part_orders FOR UPDATE USING (
  repair_request_id IN (SELECT id FROM public.repair_requests WHERE customer_id = auth.uid())
);

-- ============ PROMOTIONS ============
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id UUID NOT NULL REFERENCES public.vendor_profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  promotion_type promotion_type NOT NULL,
  amount_paid_ksh INT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Promotions public read" ON public.promotions FOR SELECT USING (true);
CREATE POLICY "Vendor manages own promotions" ON public.promotions FOR ALL USING (vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid())) WITH CHECK (vendor_id IN (SELECT id FROM public.vendor_profiles WHERE user_id = auth.uid()));

-- ============ NOTIFICATIONS ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  type notification_type NOT NULL,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "System insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- ============ SIGNUP TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone_number)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', '')
  );
  -- Default role: customer (vendor must register separately)
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ STORAGE BUCKETS ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('product-images','product-images', true),
  ('shop-photos','shop-photos', true),
  ('avatars','avatars', true),
  ('vendor-documents','vendor-documents', false);

CREATE POLICY "Public read product images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Vendor upload product images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Vendor update own product images" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Vendor delete own product images" ON storage.objects FOR DELETE USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public read shop photos" ON storage.objects FOR SELECT USING (bucket_id = 'shop-photos');
CREATE POLICY "Vendor upload shop photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'shop-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "User upload own avatar" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "User update own avatar" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Vendor read own documents" ON storage.objects FOR SELECT USING (bucket_id = 'vendor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Vendor upload own documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'vendor-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============ SEED VENDORS ============
-- Demo vendors without auth users (user_id NULL)
INSERT INTO public.vendor_profiles (id, business_name, physical_address, latitude, longitude, operating_hours, verification_status, total_completed_transactions, average_rating, subscription_tier) VALUES
  ('11111111-1111-1111-1111-111111111111','ByteHub Nairobi','Tom Mboya Street, Nairobi CBD, Ground Floor, Shop 14',-1.2833,36.8172,'Mon-Sat 8:00AM - 6:00PM','verified',127,4.7,'standard'),
  ('22222222-2222-2222-2222-222222222222','TechZone Westlands','Westlands Mall, 2nd Floor, Shop 34, Westlands, Nairobi',-1.2638,36.8030,'Mon-Sun 9:00AM - 7:00PM','verified',243,4.8,'premium'),
  ('33333333-3333-3333-3333-333333333333','Gadget Palace Moi Avenue','Moi Avenue, Rehema House, 1st Floor, Shop 7, Nairobi',-1.2841,36.8243,'Mon-Sat 8:30AM - 5:30PM','verified',89,4.5,'basic'),
  ('44444444-4444-4444-4444-444444444444','Juja Tech Hub','Juja Town Centre, Near JKUAT Gate C, Ground Floor',-1.1022,37.0146,'Mon-Sat 7:30AM - 7:00PM','verified',156,4.6,'standard'),
  ('55555555-5555-5555-5555-555555555555','ProFix Repairs and Sales','Ronald Ngala Street, Nairobi, Shop 22B',-1.2862,36.8298,'Mon-Sat 8:00AM - 6:30PM','verified',312,4.9,'premium');

-- Seed products (using Unsplash placeholder images)
INSERT INTO public.products (vendor_id, category, brand, model_name, year_of_manufacture, condition, price_ksh, quantity_in_stock, warranty_status, warranty_duration_months, description, image_urls, average_rating) VALUES
  ('11111111-1111-1111-1111-111111111111','laptop','HP','EliteBook 840 G5',2018,'refurbished',45000,3,true,3,'Intel Core i5 8th gen, 8GB RAM, 256GB SSD. Refurbished to like-new condition with 3-month warranty.','{https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800,https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800,https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800}',4.6),
  ('11111111-1111-1111-1111-111111111111','smartphone','Samsung','Galaxy A54',2023,'new',38000,5,true,12,'Brand new sealed unit. 128GB storage, 8GB RAM, 50MP camera. 1-year manufacturer warranty.','{https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800,https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800,https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800}',4.8),
  ('22222222-2222-2222-2222-222222222222','laptop','Apple','MacBook Air M1',2021,'refurbished',95000,2,true,6,'Apple M1 chip, 8GB unified memory, 256GB SSD. Battery health 95%+. 6-month warranty.','{https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800,https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800,https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=800}',4.9),
  ('22222222-2222-2222-2222-222222222222','smartphone','Apple','iPhone 13 128GB',2021,'used',72000,4,false,0,'Used iPhone 13 in excellent condition. 128GB storage. Battery health 89%.','{https://images.unsplash.com/photo-1632661674596-df8be070a5c5?w=800,https://images.unsplash.com/photo-1616348436168-de43ad0db179?w=800,https://images.unsplash.com/photo-1592286927505-1def25115558?w=800}',4.5),
  ('22222222-2222-2222-2222-222222222222','laptop','Dell','Latitude 5510',2020,'refurbished',48000,6,true,3,'Intel Core i7, 16GB RAM, 512GB SSD. Professionally refurbished.','{https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800,https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800,https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800}',4.7),
  ('33333333-3333-3333-3333-333333333333','laptop','Lenovo','ThinkPad X1 Carbon',2020,'refurbished',88000,1,true,6,'Premium ultrabook. Intel Core i7, 16GB RAM, 1TB SSD. Carbon fiber chassis.','{https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800,https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800,https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800}',4.8),
  ('33333333-3333-3333-3333-333333333333','smartphone','Tecno','Camon 20 Pro',2023,'new',28000,10,true,12,'Brand new. 256GB storage, 8GB RAM, 64MP camera with night mode.','{https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800,https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=800,https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800}',4.4),
  ('44444444-4444-4444-4444-444444444444','laptop','HP','650 G2',2016,'refurbished',28000,4,true,3,'Reliable budget refurbished laptop. Core i5, 8GB RAM, 256GB SSD. Perfect for students.','{https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800,https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800,https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800}',4.3),
  ('44444444-4444-4444-4444-444444444444','smartphone','Samsung','Galaxy A14',2023,'new',18500,8,true,12,'Brand new. 64GB storage, 4GB RAM. Great entry-level smartphone.','{https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800,https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=800,https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800}',4.5),
  ('44444444-4444-4444-4444-444444444444','smartphone','Infinix','Hot 40i',2024,'new',14000,12,true,12,'Latest Infinix budget king. 128GB storage, 8GB RAM. 5000mAh battery.','{https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800,https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=800,https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800}',4.6),
  ('55555555-5555-5555-5555-555555555555','laptop','Asus','VivoBook 15',2020,'used',35000,2,false,0,'Used Asus VivoBook 15. Intel i5, 8GB RAM, 512GB SSD. Good condition.','{https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=800,https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=800,https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=800}',4.4),
  ('55555555-5555-5555-5555-555555555555','smartphone','Xiaomi','Redmi Note 12',2023,'new',22000,7,true,12,'Brand new. 128GB storage, 6GB RAM, AMOLED display, 50MP triple camera.','{https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=800,https://images.unsplash.com/photo-1605236453806-6ff36851218e?w=800,https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=800}',4.7);

-- Repair services for ProFix
INSERT INTO public.repair_services (vendor_id, service_name, device_type, description, price_min_ksh, price_max_ksh, estimated_turnaround_days) VALUES
  ('55555555-5555-5555-5555-555555555555','Laptop Screen Replacement','laptop','Full screen replacement for most laptop brands. Original-equivalent panels.',3500,8000,2),
  ('55555555-5555-5555-5555-555555555555','Motherboard Repair','laptop','Component-level motherboard repair. Power, charging, and chipset issues.',5000,15000,5),
  ('55555555-5555-5555-5555-555555555555','Phone Screen Fix','smartphone','Same-day phone screen replacement for most popular models.',1500,4500,1);
