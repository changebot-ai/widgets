{
  description = "A Nix-flake-based Node.js development environment for Stencil web components";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = {
    self,
    nixpkgs,
    flake-utils,
  }:
    flake-utils.lib.eachDefaultSystem (
      system: let
        pkgs = import nixpkgs {
          inherit system;
        };
      in {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            nodejs_26
            pnpm
            awscli2
          ];

          # The browsers Playwright downloads link against libraries that are
          # not where they look for them on NixOS, so the browsers come from
          # nixpkgs instead. Playwright finds them by revision number, which
          # ties @playwright/test in packages/core to the version below --
          # they are pinned to each other, and both move together.
          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
            export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
            export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true
            echo "playwright-driver ${pkgs.playwright-driver.version} (must match @playwright/test)"
          '';
        };
      }
    );
}
