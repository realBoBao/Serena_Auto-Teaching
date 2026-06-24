#!/usr/bin/env python3
"""
scripts/html_to_markdown.py — Convert HTML/file to clean Markdown (Node.js bridge)

Usage:
  python html_to_markdown.py <input_file>
  python html_to_markdown.py --html "<html string>"
  python html_to_markdown.py --args-file <file_path>

  --args-file: read arguments from file (one per line), avoids shell escaping issues

Output: clean Markdown to stdout
"""

import sys
import os
from pathlib import Path

def html_to_md(html_content: str) -> str:
    """Convert HTML to Markdown using markdownify."""
    from markdownify import markdownify
    return markdownify(html_content, heading_style="ATX", strip=["img"])

def file_to_md(filepath: str) -> str:
    """Convert file to Markdown based on extension."""
    path = Path(filepath)
    ext = path.suffix.lower()

    if ext == ".html" or ext == ".htm":
        html = path.read_text(encoding="utf-8", errors="replace")
        return html_to_md(html)

    elif ext == ".txt":
        return path.read_text(encoding="utf-8", errors="replace")

    elif ext == ".xml" or ext == ".rss":
        from defusedxml import ElementTree
        try:
            tree = ElementTree.parse(filepath)
            root = tree.getroot()
            parts = []
            for elem in root.iter():
                if elem.text and elem.text.strip():
                    tag = elem.tag.split("}")[-1]
                    if tag in ("title", "h1", "h2", "h3", "h4"):
                        level = int(tag[1]) if tag[0] == "h" else 1
                        parts.append("#" * level + " " + elem.text.strip())
                    elif tag == "p":
                        parts.append(elem.text.strip())
                    elif tag == "description":
                        parts.append(elem.text.strip())
            return "\n\n".join(parts)
        except Exception:
            return path.read_text(encoding="utf-8", errors="replace")

    else:
        return path.read_text(encoding="utf-8", errors="replace")

def main():
    if len(sys.argv) < 2:
        print("Usage: python html_to_markdown.py <file> OR --html '<html>' OR --args-file <file>", file=sys.stderr)
        sys.exit(1)

    # Support --args-file (reads args from file, one per line)
    if sys.argv[1] == "--args-file":
        args_file = sys.argv[2]
        if not os.path.exists(args_file):
            print(f"Error: args file not found: {args_file}", file=sys.stderr)
            sys.exit(1)
        with open(args_file, "r", encoding="utf-8") as f:
            args = [line.strip() for line in f if line.strip()]
        sys.argv = [sys.argv[0]] + args

    if sys.argv[1] == "--html":
        html = sys.argv[2]
        print(html_to_md(html))
    else:
        filepath = sys.argv[1]
        if not os.path.exists(filepath):
            print(f"Error: file not found: {filepath}", file=sys.stderr)
            sys.exit(1)
        print(file_to_md(filepath))

if __name__ == "__main__":
    main()
