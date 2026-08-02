import sys
from PIL import Image

def main():
    input_path = r"C:\Users\Administrator\Downloads\ChatGPT Image Aug 2, 2026, 09_52_20 PM.png"
    output_path = r"C:\Users\Administrator\techtrustkenya\public\chatgpt_logo_nobg_pil.png"
    
    print(f"Processing {input_path}...")
    try:
        img = Image.open(input_path)
        img = img.convert("RGBA")
        datas = img.getdata()
        
        newData = []
        # Find dominant background color by sampling corners
        width, height = img.size
        bg_colors = [img.getpixel((0,0)), img.getpixel((width-1,0)), img.getpixel((0,height-1)), img.getpixel((width-1,height-1))]
        bg_color = max(set(bg_colors), key=bg_colors.count)
        
        # Make the background color transparent
        # we will use a small threshold to catch slight variations
        threshold = 20
        for item in datas:
            if abs(item[0] - bg_color[0]) < threshold and \
               abs(item[1] - bg_color[1]) < threshold and \
               abs(item[2] - bg_color[2]) < threshold:
                newData.append((255, 255, 255, 0))
            else:
                newData.append(item)
        
        img.putdata(newData)
        img.save(output_path, "PNG")
        print(f"Saved to {output_path}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
