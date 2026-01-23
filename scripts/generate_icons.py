#!/usr/bin/env python3
"""
Icon Generator Script

Generates all required icon sizes from a master PNG for iOS, web, and PWA.
Also generates OG image (1200x630) by cropping the master.

Usage:
    python generate_icons.py <master.png> [-o output_dir]
"""

import argparse
import sys
from pathlib import Path

from PIL import Image

# Icon configurations: (size, filename, preserve_transparency)
ICON_CONFIGS = [
    # iOS icons (no transparency)
    (1024, "icon-1024.png", False),
    (180, "apple-touch-icon.png", False),
    (167, "icon-167.png", False),
    (152, "icon-152.png", False),
    (120, "icon-120.png", False),
    (76, "icon-76.png", False),
    (60, "icon-60.png", False),
    (87, "icon-87.png", False),
    (80, "icon-80.png", False),
    (58, "icon-58.png", False),
    (40, "icon-40.png", False),
    (29, "icon-29.png", False),
    # Web favicons (with transparency)
    (32, "favicon-32x32.png", True),
    (16, "favicon-16x16.png", True),
    (48, "favicon-48.png", True),
    # PWA icons (with transparency)
    (192, "icon-192.png", True),
    (512, "icon-512.png", True),
]

# OG image size
OG_SIZE = (1200, 630)


def resize_icon(img: Image.Image, size: int, preserve_transparency: bool) -> Image.Image:
    """Resize image to square icon size."""
    resized = img.resize((size, size), Image.Resampling.LANCZOS)

    if not preserve_transparency:
        # Convert to RGB with white background for iOS icons
        if resized.mode == "RGBA":
            background = Image.new("RGB", resized.size, (255, 255, 255))
            background.paste(resized, mask=resized.split()[3])
            return background
        elif resized.mode != "RGB":
            return resized.convert("RGB")

    return resized


def create_logo_with_black_bg(img: Image.Image, size: int, tolerance: int = 30) -> Image.Image:
    """Create logo by replacing the background color with black.

    Detects background color from corners and replaces similar colors with black.
    """
    resized = img.resize((size, size), Image.Resampling.LANCZOS)

    if resized.mode != "RGBA":
        resized = resized.convert("RGBA")

    pixels = resized.load()
    width, height = resized.size

    # Sample background color from corners
    corner_pixels = [
        pixels[0, 0],
        pixels[width - 1, 0],
        pixels[0, height - 1],
        pixels[width - 1, height - 1],
    ]

    # Average the corner colors (use first 3 channels: RGB)
    bg_r = sum(p[0] for p in corner_pixels) // 4
    bg_g = sum(p[1] for p in corner_pixels) // 4
    bg_b = sum(p[2] for p in corner_pixels) // 4

    # Replace background color with black
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # Check if pixel is close to background color
            if (abs(r - bg_r) < tolerance and
                abs(g - bg_g) < tolerance and
                abs(b - bg_b) < tolerance):
                pixels[x, y] = (0, 0, 0, a)

    return resized


def create_maskable_icon(img: Image.Image, size: int) -> Image.Image:
    """Create maskable icon with safe zone padding (10% on each side)."""
    # Safe zone is 80% of the icon, so we scale the content to fit
    content_size = int(size * 0.8)

    # Resize content
    content = img.resize((content_size, content_size), Image.Resampling.LANCZOS)

    # Create transparent canvas
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    # Center the content
    offset = (size - content_size) // 2
    canvas.paste(content, (offset, offset))

    return canvas


def resize_og_image(img: Image.Image) -> Image.Image:
    """Resize image to OG dimensions (1200x630), cropping to fit aspect ratio."""
    target_w, target_h = OG_SIZE
    target_ratio = target_w / target_h

    img_w, img_h = img.size
    img_ratio = img_w / img_h

    if img_ratio > target_ratio:
        # Image is wider, crop width
        new_w = int(img_h * target_ratio)
        left = (img_w - new_w) // 2
        img = img.crop((left, 0, left + new_w, img_h))
    elif img_ratio < target_ratio:
        # Image is taller, crop height
        new_h = int(img_w / target_ratio)
        top = (img_h - new_h) // 2
        img = img.crop((0, top, img_w, top + new_h))

    # Resize to target
    resized = img.resize(OG_SIZE, Image.Resampling.LANCZOS)

    # Convert to RGB (no transparency for OG images)
    if resized.mode == "RGBA":
        background = Image.new("RGB", resized.size, (255, 255, 255))
        background.paste(resized, mask=resized.split()[3])
        return background
    elif resized.mode != "RGB":
        return resized.convert("RGB")

    return resized


def generate_icons(master_path: Path, output_dir: Path) -> None:
    """Generate all icons from master image."""
    # Load master image
    print(f"Loading master image: {master_path}")
    master = Image.open(master_path)

    # Validate master image
    if master.size[0] != master.size[1]:
        print(f"Warning: Master image is not square ({master.size[0]}x{master.size[1]})")
    if master.size[0] < 1280:
        print(f"Warning: Master image is smaller than 1280x1280, OG image quality may be reduced")
    elif master.size[0] < 1024:
        print(f"Warning: Master image is smaller than 1024x1024, quality may be reduced")

    # Ensure RGBA mode for processing
    if master.mode != "RGBA":
        master = master.convert("RGBA")

    # Create output directory
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Output directory: {output_dir}")

    # Generate standard icons
    print("\nGenerating icons...")
    for size, filename, preserve_transparency in ICON_CONFIGS:
        icon = resize_icon(master, size, preserve_transparency)
        output_path = output_dir / filename
        icon.save(output_path, "PNG", optimize=True)
        transparency_info = "transparent" if preserve_transparency else "opaque"
        print(f"  {filename} ({size}x{size}, {transparency_info})")

    # Generate maskable icon
    maskable = create_maskable_icon(master, 512)
    maskable_path = output_dir / "icon-512-maskable.png"
    maskable.save(maskable_path, "PNG", optimize=True)
    print(f"  icon-512-maskable.png (512x512, maskable with padding)")

    # Generate logo with black background
    logo = create_logo_with_black_bg(master, 192)
    logo_path = output_dir / "logo.png"
    logo.save(logo_path, "PNG", optimize=True)
    print(f"  logo.png (192x192, black background)")

    # Generate OG image from master (cropped to 1200x630)
    print("\nGenerating OG image...")
    og_image = resize_og_image(master)
    og_output = output_dir / "og-image.png"
    og_image.save(og_output, "PNG", optimize=True)
    print(f"  og-image.png ({OG_SIZE[0]}x{OG_SIZE[1]})")

    total_icons = len(ICON_CONFIGS) + 3  # +1 maskable, +1 OG, +1 logo
    print(f"\nDone! Generated {total_icons} images in {output_dir}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate all required icon sizes from a master PNG"
    )
    parser.add_argument(
        "master",
        type=Path,
        help="Path to master PNG (should be 1280x1280 or larger square)"
    )
    parser.add_argument(
        "-o", "--output",
        type=Path,
        default=Path("./icons_output"),
        help="Output directory (default: ./icons_output)"
    )

    args = parser.parse_args()

    # Validate master file
    if not args.master.exists():
        print(f"Error: Master file not found: {args.master}", file=sys.stderr)
        sys.exit(1)

    generate_icons(args.master, args.output)


if __name__ == "__main__":
    main()
