import re

filepath = r"C:\Users\Administrator\techtrustkenya\src\pages\vendor\VendorDashboard.tsx"

with open(filepath, "r", encoding="utf-8") as f:
    content = f.read()

if "NotificationsBell" not in content:
    content = content.replace(
        "import { useAuth } from \"@/hooks/useAuth\";",
        "import { useAuth } from \"@/hooks/useAuth\";\nimport { NotificationsBell } from \"@/components/notifications/NotificationsBell\";\nimport { Link } from \"react-router-dom\";"
    )

    old_header = """            <p className="text-xs text-muted-foreground mt-1">
              Manage listings, orders, and Float escrow payouts for your store.
            </p>
          </div>
        </div>"""

    new_header = """            <p className="text-xs text-muted-foreground mt-1">
              Manage listings, orders, and Float escrow payouts for your store.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm font-medium hover:underline text-muted-foreground">Marketplace</Link>
            <NotificationsBell />
          </div>
        </div>"""
    
    content = content.replace(old_header, new_header)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
    print("Updated VendorDashboard.tsx")
else:
    print("NotificationsBell already in VendorDashboard.tsx")
