---
title: Nomu's First Post
date: 2025-12-24
category: Development
author: Nomu
excerpt: My chaotic journey building a simple, no BS personal site; why I scrapped everything (again), went vanilla, and here we are.
cover: assets\images\Nomu's_Site.png
---

# How did it start?
For the past few months, I have been messing with sites for myself, trying different things and always scrapping them midway. You know that cycle. I finally said to myself: keep it simple and stick to it no matter what. So here we are on December 24th[^1], 2025, with the first post.

# The making
## Setup
I fed Perplexity my idea: a minimal site with a blog and stuff. It gave back a basic template. The design is super generic with no taste, but it beats starting from zero. I tweaked it from there.

## New day
Here is mostly what I did:
- Contact section with socials on the left and anon form on the right.
- Markdown styling for posts: headings with borders, code gradients, that kind of thing.

Well, something broke. Posts show on the list but not in single view. I spent two hours poking at HTML and CSS. Gave up and started over. Easier that way.

## Sonnet
[**_Claude_**](https://claude.ai/) though, it is peak. I held off using it to save my free tier, but the last prompt fixed everything perfectly. I wonder if Perplexity Pro's Sonnet 4.5 is real or just hype.

## Github
When the site was almost functional, I hosted it on Github, though the posts weren't showing up so I had to add a .nojerkyll file and fix the paths in the blog-loader.js script.

# Features
## Tech
- Vanilla HTML, CSS, and JavaScript. Genius, right? No need for more. Frontend only because I cannot deal with frameworks right now and do not want the hassle.
- [Formspree](https://formspree.io/) for anonymous messages, quick and low spam.
- [Markdown-it](https://github.com/markdown-it/markdown-it) to turn Markdown files into HTML right in the browser. Code blocks, lists, tables, and more all work.
- Hosted on Github Pages
## Index
Simple: latest posts, my socials, anonymous form. Async communication vibe.

## Blog
Search, filters by category, post info.

## Articles
Reading time guess. Grabs a Markdown file and renders it. Supports all the Markdown goodies.

# What's next?
Don't know, I'm thinking about adding tutorials, I'm gonna work today (_26th_) on making the pictures clickable and maybe tweaking the styling a bit and fixing up the code. Probably also adding a proper comment section.

[^1]: [News](https://fox4kc.com/news/national/watch-man-makes-dirt-angels-while-hiding-from-hillsborough-county-deputies/)
