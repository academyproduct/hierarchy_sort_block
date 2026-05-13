# Hierarchy Sorter

A lightweight web app for organizing screenshots/images into a visual hierarchy via drag-and-drop.

## Features

- Drag images from a pool into a nested hierarchy tree
- Visual nesting with color-coded depth indicators and indented bounding boxes
- Re-drag images to rearrange or return them to the pool
- Reset button to clear all assignments
- State persisted in sessionStorage
- Zero runtime dependencies — vanilla HTML/CSS/JS

## Local Development

Open `index.html` in a browser, or serve it locally:

```bash
python3 -m http.server 8000
```

Then visit http://localhost:8000

To stop the server, press `Ctrl+C` in the terminal. If the port is stuck in use:

```bash
lsof -ti:8000 | xargs kill
```

## Deployment (AWS Serverless)

Prerequisites:
- AWS CLI configured with appropriate credentials
- CloudFormation permissions for S3, CloudFront

Deploy:

```bash
./deploy.sh
```

This will:
1. Create/update a CloudFormation stack with S3 + CloudFront
2. Sync all static assets to the S3 bucket
3. Invalidate the CloudFront cache
4. Print the live URL

## Changing Images

Edit the `IMAGES` array in `app.js` and add corresponding files to the `assets/` directory. Then re-run `./deploy.sh`.

## Architecture

```
index.html      — Single page app shell
styles.css      — All styling (dark theme, hierarchy visuals)
app.js          — Drag-and-drop logic, tree state management
assets/         — Image files
template.yaml   — CloudFormation (S3 + CloudFront)
deploy.sh       — One-command deployment script
```
