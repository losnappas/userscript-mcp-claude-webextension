{
  description = "A basic flake";

  inputs = {
    flake-parts.url = "github:hercules-ci/flake-parts";
    nixpkgs.url = "github:NixOS/nixpkgs?ref=nixos-unstable";
    systems.url = "github:nix-systems/default";
    flake-root.url = "github:srid/flake-root";
    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs =
    inputs@{ flake-parts, ... }:
    flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [
        inputs.flake-root.flakeModule
        inputs.treefmt-nix.flakeModule
      ];
      systems = import inputs.systems;
      perSystem =
        {
          config,
          self',
          inputs',
          lib,
          pkgs,
          system,
          ...
        }:
        {

          # Per-system attributes can be defined here. The self' and inputs'
          # module parameters provide easy access to attributes of the same
          # system.

          treefmt = {
            inherit (config.flake-root) projectRootFile;
            programs = {
              nixfmt.enable = true;
              # biome.enable = true;
              prettier.enable = true;

              # actionlint.enable = true;
              # alejandra.enable = true;
              # asmfmt.enable = true;
              # beautysh.enable = true;
              # biome.enable = true;
              # black.enable = true;
              # buildifier.enable = true;
              # cabal-fmt.enable = true;
              # clang-format.enable = true;
              # cljfmt.enable = true;
              # cmake-format.enable = true;
              # csharpier.enable = true;
              # cue.enable = true;
              # d2.enable = true;
              # dart-format.enable = true;
              # deadnix.enable = true;
              # deno.enable = true;
              # dhall.enable = true;
              # dnscontrol.enable = true;
              # dos2unix.enable = true;
              # dprint.enable = true;
              # elm-format.enable = true;
              # erlfmt.enable = true;
              # fantomas.enable = true;
              # fish_indent.enable = true;
              # fnlfmt.enable = true;
              # formatjson5.enable = true;
              # fourmolu.enable = true;
              # fprettify.enable = true;
              # gdformat.enable = true;
              # genemichaels.enable = true;
              # gleam.enable = true;
              # gofmt.enable = true;
              # gofumpt.enable = true;
              # goimports.enable = true;
              # golines.enable = true;
              # google-java-format.enable = true;
              # hclfmt.enable = true;
              # hlint.enable = true;
              # isort.enable = true;
              # jsonfmt.enable = true;
              # jsonnet-lint.enable = true;
              # jsonnetfmt.enable = true;
              # just.enable = true;
              # keep-sorted.enable = true;
              # ktfmt.enable = true;
              # ktlint.enable = true;
              # latexindent.enable = true;
              # leptosfmt.enable = true;
              # mdformat.enable = true;
              # mdsh.enable = true;
              # meson.enable = true;
              # mix-format.enable = true;
              # muon.enable = true;
              # mypy.enable = true;
              # nickel.enable = true;
              # nimpretty.enable = true;
              # nixfmt.enable = true;
              # nixpkgs-fmt.enable = true;
              # nufmt.enable = true;
              # ocamlformat.enable = true;
              # odinfmt.enable = true;
              # opa.enable = true;
              # ormolu.enable = true;
              # packer.enable = true;
              # perltidy.enable = true;
              # php-cs-fixer.enable = true;
              # pinact.enable = true;
              # prettier.enable = true;
              # protolint.enable = true;
              # purs-tidy.enable = true;
              # rubocop.enable = true;
              # ruff-check.enable = true;
              # ruff-format.enable = true;
              # rufo.enable = true;
              # rustfmt.enable = true;
              # scalafmt.enable = true;
              # shellcheck.enable = true;
              # shfmt.enable = true;
              # sqlfluff.enable = true;
              # sqruff.enable = true;
              # statix.enable = true;
              # stylish-haskell.enable = true;
              # stylua.enable = true;
              # swift-format.enable = true;
              # taplo.enable = true;
              # templ.enable = true;
              # terraform.enable = true;
              # texfmt.enable = true;
              # toml-sort.enable = true;
              # typos.enable = true;
              # typstfmt.enable = true;
              # typstyle.enable = true;
              # yamlfmt.enable = true;
              # zig.enable = true;
              # zprint.enable = true;
            };
          };

          devShells.default = pkgs.mkShell {
            # Sets up FLAKE_ROOT var.
            inputsFrom = [ config.flake-root.devShell ];
            packages = with pkgs; [
              nil
              vtsls # ts language server
              package-version-server
              vscode-langservers-extracted
              yaml-language-server
              tailwindcss-language-server
              svelte-language-server

              # prettierd

              nodejs
              pnpm
              # bun
            ];
            env = {
              PROJECT_FORMATTER = lib.getExe self'.formatter;
            };
          };

          # packages.default =

        };
      flake = {
        # The usual flake attributes can be defined here, including system-
        # agnostic ones like nixosModule and system-enumerating ones, although
        # those are more easily expressed in perSystem.

      };
    };
}
