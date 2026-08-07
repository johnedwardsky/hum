#!/usr/bin/env python3
import os
import sys
import socket
import subprocess

def find_free_port(start_port=5000):
    """Finds an available TCP port starting from start_port."""
    port = start_port
    while port < 65535:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except OSError:
                port += 1
    return start_port

def main():
    # Detect virtual environment python executable
    venv_dir = "venv"
    if os.name == 'nt':
        venv_python = os.path.join(venv_dir, "Scripts", "python.exe")
    else:
        venv_python = os.path.join(venv_dir, "bin", "python")

    python_exe = venv_python if os.path.exists(venv_python) else sys.executable

    # Find a free port starting from 5000
    port = find_free_port(5000)

    print("=" * 60)
    print("                HUMANTICA LOCAL SERVER")
    print("=" * 60)
    print(f" Python Executable: {python_exe}")
    print(f" Server Port:      {port}")
    print(f" Local Address:    http://127.0.0.1:{port}/")
    print("=" * 60)
    print(" Press Ctrl+C to stop the server.\n", flush=True)

    # Set the PORT environment variable for app.py
    env = os.environ.copy()
    env["PORT"] = str(port)

    try:
        # Run app.py using the determined python interpreter
        subprocess.run([python_exe, "app.py"], env=env)
    except KeyboardInterrupt:
        print("\n\nStopping server. Goodbye!")

if __name__ == "__main__":
    main()
