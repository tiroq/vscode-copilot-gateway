# Publishing Guide

This guide covers how to publish the Copilot Gateway extension to the VS Code Marketplace.

## Prerequisites

1. **Visual Studio Marketplace Account**
   - Create a publisher account at https://marketplace.visualstudio.com/manage
   - Note your publisher ID (currently: `tiroq`)

2. **Personal Access Token (PAT)**
   - Create at https://dev.azure.com/[YOUR_ORGANIZATION]/_usersSettings/tokens
   - Scopes required: `Marketplace (Manage)`
   - Keep token secure

3. **Install vsce**
   ```bash
   npm install -g @vscode/vsce
   ```

## Pre-Publication Checklist

- [ ] Update `version` in `package.json`
- [ ] Update `CHANGELOG.md` with release notes
- [ ] Verify `README.md` is complete and accurate
- [ ] Test extension locally (`F5` in VS Code)
- [ ] Verify icon.png exists (128x128 recommended)
- [ ] Check LICENSE file is present (MIT)
- [ ] Review package.json metadata (keywords, description, etc.)
- [ ] Ensure all dependencies are listed correctly
- [ ] Run `npm run compile` successfully
- [ ] Test all commands work
- [ ] Verify dashboard functionality
- [ ] Test with actual Copilot integration

## Build Package

Create a `.vsix` package for testing:

```bash
vsce package
```

This creates `copilot-gateway-[version].vsix` which you can:
- Install locally: `code --install-extension copilot-gateway-[version].vsix`
- Share with testers
- Upload manually to marketplace

## Publish to Marketplace

### First Time Setup

```bash
vsce login tiroq
# Enter your Personal Access Token when prompted
```

### Publish New Version

```bash
# Ensure code is compiled
npm run compile

# Package and publish
vsce publish

# Or with version bump
vsce publish patch  # 0.1.0 -> 0.1.1
vsce publish minor  # 0.1.0 -> 0.2.0
vsce publish major  # 0.1.0 -> 1.0.0
```

### Manual Upload

1. Package: `vsce package`
2. Go to https://marketplace.visualstudio.com/manage/publishers/tiroq
3. Click "..." menu → "Update extension"
4. Upload `.vsix` file

## Post-Publication

1. **Verify Listing**
   - Check https://marketplace.visualstudio.com/items?itemName=tiroq.copilot-gateway
   - Verify icon, screenshots, README display correctly

2. **Test Installation**
   ```bash
   code --install-extension tiroq.copilot-gateway
   ```

3. **Monitor**
   - Check install/download counts
   - Review user feedback and ratings
   - Monitor GitHub issues

## Versioning Strategy

Follow Semantic Versioning (semver):

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features, backward compatible
- **PATCH** (0.0.1): Bug fixes, backward compatible

## Common Issues

### Package Validation Errors

- **Missing README**: Ensure README.md exists
- **Missing LICENSE**: Add LICENSE file
- **Invalid icon**: Use PNG, 128x128 recommended
- **Large package**: Add files to `.vscodeignore`

### Authentication Errors

- PAT expired: Generate new token
- Wrong scope: Ensure "Marketplace (Manage)" selected
- Wrong publisher: Use `vsce login <publisher-id>`

## .vscodeignore

Files/folders excluded from package (already configured):

```
.vscode/
node_modules/
out/
src/
.gitignore
tsconfig.json
```

## Release Checklist

Before each release:

1. [ ] Update version in package.json
2. [ ] Update CHANGELOG.md
3. [ ] Run `npm run compile`
4. [ ] Test extension end-to-end
5. [ ] Create git tag: `git tag v0.1.0`
6. [ ] Push tag: `git push origin v0.1.0`
7. [ ] Build package: `vsce package`
8. [ ] Test .vsix locally
9. [ ] Publish: `vsce publish`
10. [ ] Verify on marketplace
11. [ ] Create GitHub release with notes

## Support

- **Marketplace Issues**: marketplace-feedback@microsoft.com
- **Publishing Docs**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **vsce Tool**: https://github.com/microsoft/vscode-vsce

## Security

- **Never commit** Personal Access Tokens
- **Keep tokens secure** - rotate regularly
- **Review permissions** - use minimal scopes needed
- **Monitor usage** - check marketplace analytics

## Marketing

- Add screenshots to README
- Create demo GIF/video
- Share on social media
- Write blog post
- Submit to VS Code extension lists
- Engage with community feedback
