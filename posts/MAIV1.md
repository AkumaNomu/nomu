---
title: Trying to make playlists flow better
date: 2025-12-26
category: Projects
author: Nomu
excerpt: Working on a little project to reorder playlists so songs transition better
---

# Why?
So theres this youtube channel called [mai](https://www.youtube.com/@mai_dq) that makes these amazing playlists where every song just flows into the next one perfectly. its like magic. 

i always shuffle my playlists and it's not the greatest (though my music taste is awesome).
so i thought, what if i could make something that takes a playlist and reorders it to flow better? i'm calling it mai for now, after that channel.
i started with some code recently. just poking around.

# Let's Play
## The Data
### This is a robbery, empty your databases!
first i grabbed one of my playlists from spotify. Although I use youtube music now, I wanted to use spotify's api to get all the metadata i needed since they let you export playlists as a csv, which is nice. it comes with a ton of data about each song - not just the name and artist, but all these spotify audio features like danceability, energy, tempo, key, all that.
### Cleaning
i loaded it up and immediately got rid of most of the columns. i dont care about the record label or when i added the song. i just want the audio features. the ones i kept are: danceability, energy, speechiness, acousticness, liveness, valence, tempo, and key.

```python
import pandas as pd

# Grabbing my playlist data
data_path = 'data/Focus.csv'
df = pd.read_csv(data_path)

# Just give me the stuff that actually affects how it SOUNDS
df = df.drop(['Track URI', 'Album Name', 'Artist Name(s)',
       'Release Date', 'Popularity', 'Explicit', 'Added By',
       'Added At', 'Record Label',
       'Time Signature', 'Duration (ms)', 'Genres'], axis=1)
```

What's left are things like:

- Key (is it in C major? A minor?)
- Tempo (how fast it is)
- Danceability, Energy, Valence (Spotify's weird 0-1 scores for mood)
- Acousticness, Speechiness, Liveness (more weird scores)

Basically, I'm trying to compare songs by their vibes, not by genre or artist. Two songs can be completely different genres but have the same energy level and key, and they'll flow together nicely.

### Comparing Apples to Apples

```python
def normalize(column):
    # Squish a column's values down to 0-1 so they play nice together
    col_max = df[column].max()
    col_min = df[column].min()
    df[column] = (df[column] - col_min) / (col_max - col_min)

normalize('Tempo')
```

## What Makes Two Songs _Flow_ Together? 
### Do They Dance?
As someone who's failed to learn guitar multiple times, I barely understand music theory. But I know this: songs in the same or related keys just sound right together.
I used something called the Circle of Fifths (which looks cool and mystical) to figure out which keys are friends:
```python
def key_comp(key1, key2):
    diff = abs(key1 - key2)
    circle_diff = min(diff, 12 - diff)  # The shortest path around the circle
    
    # My totally scientific, not-at-all-made-up scoring system:
    if circle_diff == 0:          # Same key - best friends
        return 1.0
    elif circle_diff == 5 or circle_diff == 7:  # Perfect 4th/5th - close cousins
        return 0.9
    elif circle_diff == 3 or circle_diff == 4:  # Minor/Major 3rd - acquaintances
        return 0.7
    elif circle_diff == 2 or circle_diff == 10: # Whole step - awkward small talk
        return 0.5
    else:                         # Distant relatives who avoid each other
        return 0.2
```
### Vibing?
This is where it gets slightly math-y, but stay with me. I'm treating each song as a point in 7-dimensional "_mood space_" (which sounds way cooler than it is).

```python
# These are the "mood" features I care about
features = ['Danceability', 'Energy', 'Speechiness', 
           'Acousticness', 'Liveness', 'Valence', 'Tempo']
```
Now remember the points in the mood spaces? we do some magical wizardry to calculate their lengths and their products. 
```python
def vector_mod(row):
    s = 0.0
    for col in features:
        s += row[col] ** 2
    return s ** 0.5

def dot_product(row1, row2):
    s = 0.0
    for col in features:
        s += row1[col] * row2[col]
    return s
```

Why did I calculate all of that? Because I'm using something called cosine similarity. Basically, it checks if two songs are pointing in the same "_direction_" in mood space.

```python
def cosine_similarity(row1, row2):
    """
    Fancy way of asking: "Are these two songs feeling the same type of way?"
    Returns 1 if identical vibes, 0 if completely different vibes.
    """
    dp = dot_product(row1, row2)     # Dot product - how much the moods overlap
    # Calculate the "length" of each song's mood vector
    mod1 = vector_mod(row1)
    mod2 = vector_mod(row2)
    if mod1 == 0 or mod2 == 0:   # If either has zero mood (impossible, but computers are pedantic)
        return 0.0

    # The actual similarity score
    return dp / (mod1 * mod2)
```

Why this instead of just comparing numbers directly? Because two "_chill_" songs might be chill in different ways: one might be acoustic folk, the other might be ambient electronic. Cosine similarity catches that they're both chill, even if the specifics differ.

### The Magic Formula (That's Probably Wrong)
Now I need to combine key compatibility and mood similarity. After some trial and error (and many terrible playlists):
```python
def Similarity(song1_index, song2_index):
    # My best guess at how well two songs would flow together
    first = df.iloc[song1_index]
    second = df.iloc[song2_index]
    
    key_score = key_comp(first['Key'], second['Key'])
    mood_score = cosine_similarity(first, second)
    
    # Weighted average: mood is more as important as key
    # (Because going from sad to happy feels worse than changing key)
    return (2 * mood_score + key_score) / 3
```

The 2:1 ratio? Complete guess. Feel free to tweak it. My ears aren't exactly golden.

### The Asian Parents Method (Comparison & Bruteforce)

Well, the code below has a complexity of **$O(n^2)$**

```python
edges = []  # This will store all our song relationships

# The inefficient but straightforward way
for i in range(len(df)):
    for j in range(i+1, len(df)):  # Don't compare a song to itself
        sim = Similarity(i, j)
        edges.append((i, j, sim))
        print(f"Song {i} and Song {j}: {sim:.4f} similarity")
```