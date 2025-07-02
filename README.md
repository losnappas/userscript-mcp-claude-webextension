# UserScript MCP for claude.ai

A webextension that lets you create user scripts at https://claude.ai, on the free tier too.

## Installation

### Addon Store

- Firefox: ...
- Chrome: ...

### From Source

```console
$ pnpm i
$ pnpm build:package:all
...Now you load the given .xpi/zip file in your browser...
```

## Usage

1. Preliminary step: log into https://claude.ai, if you aren't already
1. Go to a page where you want to have a user script, e.g. https://example.org
1. Hit the extension button
1. Claude.ai opens in a new tab, and it has access to an MCP
1. Ask Claude to, for example, "make a user script to turn the background green"
1. Claude goes off, it will write the scripts, and instruct you to refresh example.org once done

## Development

You can change your target browser in `vite.config.js`. In my experience, this setup is only slightly buggy & annoying.

```console
$ pnpm dev
```

I didn't add any svelte components thus far, because the hot reloading was broken.

## Credit

Took full advantage of: https://github.com/dnakov/claude-mcp/. Credits there for the MCP hookup processing, which is the most of the work. This code base is a fork of that repo.
