#!/usr/bin/env python3
"""
IXL Score Extension Distribution Script

This script creates a distribution zip file for the Chrome extension,
excluding development files and directories.
"""

import os
import zipfile
import json
import shutil
from datetime import datetime

def get_version_from_manifest():
    """Read version from manifest.json"""
    try:
        with open('manifest.json', 'r') as f:
            manifest = json.load(f)
            return manifest.get('version', 'unknown')
    except Exception as e:
        print(f"Error reading manifest.json: {e}")
        return 'unknown'

def create_distribution():
    """Create distribution zip file"""
    
    # Get version from manifest
    version = get_version_from_manifest()
    print(f"Creating distribution for version: {version}")
    
    # Create dist directory if it doesn't exist
    dist_dir = "dist"
    if not os.path.exists(dist_dir):
        os.makedirs(dist_dir)
        print(f"Created directory: {dist_dir}")
    
    # Define files and directories to include
    include_files = [
        'manifest.json',
        'popup.html',
        'popup.js',
        'content.js',
        'background.js',
        'styles.css',
        'README.md',
        'LICENSE'
    ]
    
    # Define directories to include
    include_dirs = [
        'lib',
        'icons'
    ]
    
    # Define files and directories to exclude
    exclude_patterns = [
        '.git',
        '.DS_Store',
        '__pycache__',
        '*.pyc',
        'create_distribution.py',
        '.gitignore',
        'dist'
    ]
    
    # Create distribution filename in dist folder with version
    dist_filename = os.path.join(dist_dir, f"ixl-score-extension-{version}-latest.zip")
    
    print(f"Creating distribution file: {dist_filename}")
    
    try:
        with zipfile.ZipFile(dist_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
            
            # Add individual files
            for file_path in include_files:
                if os.path.exists(file_path):
                    print(f"Adding file: {file_path}")
                    zipf.write(file_path, file_path)
                else:
                    print(f"Warning: File not found: {file_path}")
            
            # Add directories
            for dir_path in include_dirs:
                if os.path.exists(dir_path) and os.path.isdir(dir_path):
                    print(f"Adding directory: {dir_path}")
                    for root, dirs, files in os.walk(dir_path):
                        # Skip excluded patterns
                        dirs[:] = [d for d in dirs if d not in exclude_patterns]
                        
                        for file in files:
                            file_path = os.path.join(root, file)
                            # Skip excluded files
                            if not any(pattern in file_path for pattern in exclude_patterns):
                                arcname = file_path
                                print(f"  Adding: {arcname}")
                                zipf.write(file_path, arcname)
                else:
                    print(f"Warning: Directory not found: {dir_path}")
        
        print(f"\n✅ Distribution created successfully!")
        print(f"📦 File: {dist_filename}")
        print(f"📏 Size: {os.path.getsize(dist_filename) / 1024:.1f} KB")
        
        # Show contents
        print(f"\n📋 Contents:")
        with zipfile.ZipFile(dist_filename, 'r') as zipf:
            for info in zipf.infolist():
                print(f"  {info.filename}")
                
    except Exception as e:
        print(f"❌ Error creating distribution: {e}")
        return False
    
    return True

def main():
    """Main function"""
    print("🚀 IXL Score Extension Distribution Creator")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not os.path.exists('manifest.json'):
        print("❌ Error: manifest.json not found. Please run this script from the extension directory.")
        return
    
    # Create distribution
    success = create_distribution()
    
    if success:
        print("\n🎉 Distribution ready for download!")
        print("You can now share this zip file with users.")
    else:
        print("\n💥 Failed to create distribution.")

if __name__ == "__main__":
    main() 