---
id: nomu-site
name: Nomu Personal Site
description: The blog and publishing stack you are currently using.
category: Development
focus: Web
type: Project
icon: terminal
stack: Vanilla JS, Markdown, UI/UX, Blog Engine
url: https://akumanomu.github.io/nomu
repo: https://github.com/akumanomu/nomu
live:
featured: true
cover: content/projects/Nomu's Site/nomu-site.png
gallery: content/projects/Nomu's Site/nomu-site.png::Current homepage
badge: Version 3
---

# Nomu Personal Site (Version 3)

This project is a custom-built static site that serves as a personal blog and portfolio. It is designed to be a fast, minimal, and highly customized publishing stack.

## Technical Overview

The site is built with **vanilla JavaScript** and styled using **Tailwind CSS**. It does not use a traditional static site generator framework, but rather a collection of custom JavaScript modules to handle various functionalities.

Content is written in **Markdown** and organized in a custom file-based structure within the `content` directory. This allows for easy management of blog posts, projects, and other resources.

The project also includes a CI/CD pipeline using **GitHub Actions** to automate the generation of RSS feeds and sitemaps.

## Core Features

Based on the project structure, the current version of the site includes the following features:

*   **Custom Theming:** A theme switcher allows users to change the site's color scheme.
*   **Music Player:** An integrated music player with a selection of tracks.
*   **Interactive UI:** The site features various animations and custom UI components.
*   **Content Loading:** A custom loader fetches and parses Markdown content to display as HTML.
*   **Search Functionality:** A client-side search feature for finding content within the site.
*   **Social Integrations:** Modules for handling social links and interactions.
*   **Custom Tooling:** The `js/tools` directory suggests the presence of custom browser-based tools, including a security module and an image converter.
