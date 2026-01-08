import subprocess
import sys
import os
import platform

def run_command(command, cwd=None, shell=False):
    """Run a shell command and exit if it fails."""
    try:
        # On Windows, use shell=True for internal commands or complex chains if needed, 
        # but for simple executables, list of args is safer. 
        # However, user wants "runnable everywhere", let's keeps it simple.
        print(f"   $ {command}")
        
        # Split command string for subprocess unless shell=True
        if isinstance(command, str) and not shell:
            # Basic splitting (won't handle quoted args with spaces perfectly, but sufficient here)
            # For complex gcloud/vercel commands, shell=True is often easier for cross-platform scripts 
            # that users just "run".
            pass

        result = subprocess.run(
            command, 
            cwd=cwd, 
            shell=True,  # shell=True allows using string commands like "gcloud ..."
            check=True   # Raises CalledProcessError on non-zero exit code
        )
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error executing command: {command}")
        print(f"   Exit code: {e.returncode}")
        sys.exit(e.returncode)
    except FileNotFoundError:
        print(f"\n❌ Command not found: {command.split()[0]}")
        sys.exit(1)

def main():
    print("🚀 Starting Full Stack Deployment...\n")

    # ---------------------------------------------------------
    # 1. Backend Deployment (Google Cloud Run)
    # ---------------------------------------------------------
    print("📦 [Backend] Starting deployment to Google Cloud Run...")
    
    if not os.path.exists("backend/backend-cloudbuild.yaml"):
        print("❌ Error: backend/backend-cloudbuild.yaml not found!")
        sys.exit(1)

    print("   • Submitting build to Cloud Build...")
    # Using absolute path for config to be safe, or just assuming cwd is root (which strictly it should be)
    run_command("gcloud builds submit --config backend/backend-cloudbuild.yaml .")

    print("   • Deploying to Cloud Run service 'github-finder-backend'...")
    run_command(
        "gcloud run deploy github-finder-backend "
        "--image gcr.io/opesource-github-search/backend "
        "--platform managed "
        "--region us-central1 "
        "--allow-unauthenticated "
        "--to-latest"
    )

    # ---------------------------------------------------------
    # 2. Frontend Deployment (Vercel)
    # ---------------------------------------------------------
    print("\n🎨 [Frontend] Starting deployment to Vercel...")

    if not os.path.isdir("frontend"):
        print("❌ Error: 'frontend' directory not found!")
        sys.exit(1)

    # Vercel needs to run inside the frontend directory
    # On Windows "vercel" might be a cmd/ps1 shim, valid in shell=True
    run_command("vercel --prod", cwd="frontend")

    # ---------------------------------------------------------
    # Summary
    # ---------------------------------------------------------
    print("\n✅ DEPLOYMENT SUCCESSFUL!")
    print("   ----------------------------------------------------------------")
    print("   🔗 Backend:  https://github-finder-backend-18267677210.us-central1.run.app")
    print("   🔗 Frontend: https://opensource-search.vercel.app")
    print("   ----------------------------------------------------------------")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n⚠️ Deployment cancelled by user.")
        sys.exit(130)
