# Vegito API package
import os
import sys

# On Windows, ensure PostgreSQL libpq is discoverable by psycopg ctypes wrapper,
# avoiding Smart App Control / WDAC DLL blockages on precompiled binary wheels.
if sys.platform == "win32":
    for pg_ver in range(20, 11, -1):
        pg_bin = rf"C:\Program Files\PostgreSQL\{pg_ver}\bin"
        if os.path.isdir(pg_bin):
            if pg_bin not in os.environ.get("PATH", ""):
                os.environ["PATH"] = pg_bin + os.pathsep + os.environ.get("PATH", "")
            try:
                os.add_dll_directory(pg_bin)
            except (AttributeError, OSError):
                pass
            break

