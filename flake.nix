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
          # nixpkgs instead. Playwright finds them by revision number, so
          # @playwright/test in packages/core is pinned to the exact version of
          # pkgs.playwright-driver; the two move together or neither moves. A
          # mismatch reads "Executable doesn't exist at ...".
          shellHook = ''
            export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
          '';
        };
      }
    );
}
