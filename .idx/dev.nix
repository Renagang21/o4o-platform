# To learn more about how to use Nix to configure your environment
# see: https://firebase.google.com/docs/studio/customize-workspace
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-24.05"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    # 필수 Node.js 환경만
    pkgs.nodejs_20
    
    # 기본 개발 도구만
    pkgs.git
    pkgs.curl
  ];

  # 최소한의 환경 변수만
  env = {
    NODE_ENV = "development";
  };

  idx = {
    # 필수 VS Code 확장만
    extensions = [
      "ms-vscode.vscode-typescript-next"
      "esbenp.prettier-vscode"
      "dbaeumer.vscode-eslint"
    ];

    # 간단한 preview 설정만
    previews = {
      enable = true;
      previews = {
        # Main Site만 우선
        web = {
          command = ["npm" "run" "dev"];
          manager = "web";
          cwd = "apps/main-site";
          env = {
            PORT = "$PORT";
          };
        };
      };
    };

    # 자동 실행 스크립트 제거 (수동으로 실행)
    workspace = {
      onCreate = {
        # 기본 의존성 설치만
        install-deps = "npm install";
      };
      onStart = {
        # 자동 시작 제거
      };
    };
  };
}