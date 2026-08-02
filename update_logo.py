import os

src_dir = r"C:\Users\Administrator\techtrustkenya\src"

for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith((".tsx", ".ts")):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    content = f.read()
                
                if "logo.jpg" in content:
                    new_content = content.replace("logo.jpg", "logo.png")
                    new_content = new_content.replace("mix-blend-multiply", "")
                    
                    with open(filepath, "w", encoding="utf-8") as f:
                        f.write(new_content)
                    print(f"Updated {filepath}")
            except Exception as e:
                try:
                    with open(filepath, "r", encoding="utf-16") as f:
                        content = f.read()
                    
                    if "logo.jpg" in content:
                        new_content = content.replace("logo.jpg", "logo.png")
                        new_content = new_content.replace("mix-blend-multiply", "")
                        
                        with open(filepath, "w", encoding="utf-16") as f:
                            f.write(new_content)
                        print(f"Updated {filepath} (UTF-16)")
                except:
                    pass
