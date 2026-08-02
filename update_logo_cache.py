import os
import glob

directory = r"C:\Users\Administrator\techtrustkenya\src"
files_to_update = glob.glob(directory + "/**/*.tsx", recursive=True) + glob.glob(directory + "/**/*.ts", recursive=True)

for filepath in files_to_update:
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    if "/logo.png" in content:
        content = content.replace("/logo.png", "/logo-transparent.png")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Updated {filepath}")
