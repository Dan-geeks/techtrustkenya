import sys
from rembg import remove
from PIL import Image

def main():
    input_path = r"C:\Users\Administrator\Downloads\ChatGPT Image Aug 2, 2026, 09_52_20 PM.png"
    output_path = r"C:\Users\Administrator\techtrustkenya\public\chatgpt_logo_nobg.png"
    
    print(f"Processing {input_path}...")
    try:
        input_image = Image.open(input_path)
        output_image = remove(input_image)
        output_image.save(output_path, format="PNG")
        print(f"Saved to {output_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
