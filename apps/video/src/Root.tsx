import {Composition, Folder} from "remotion";
import {ArticleCover, type ArticleCoverProps} from "./compositions/ArticleCover";
import {MusicVisualizer, type MusicVisualizerProps} from "./compositions/MusicVisualizer";
import {ProjectTeaser, type ProjectTeaserProps} from "./compositions/ProjectTeaser";
import {SiteIntro} from "./compositions/SiteIntro";

const fps = 30;

export function RemotionRoot() {
  return (
    <>
      <Folder name="Editorial">
        <Composition
          component={ArticleCover}
          defaultProps={
            {
              category: "Design",
              date: "MAY 14, 2024",
              title: "Why Constraints Make Better Work",
            } satisfies ArticleCoverProps
          }
          durationInFrames={6 * fps}
          fps={fps}
          height={1080}
          id="ArticleCover"
          width={1080}
        />
        <Composition
          component={ProjectTeaser}
          defaultProps={
            {
              description: "A capture and connect tool for collecting, organizing, and rediscovering ideas over time.",
              name: "Trace",
              status: "BUILDING",
              year: 2024,
            } satisfies ProjectTeaserProps
          }
          durationInFrames={8 * fps}
          fps={fps}
          height={1080}
          id="ProjectTeaser"
          width={1920}
        />
      </Folder>
      <Folder name="Identity">
        <Composition
          component={MusicVisualizer}
          defaultProps={
            {artist: "Tycho", title: "Awake"} satisfies MusicVisualizerProps
          }
          durationInFrames={8 * fps}
          fps={fps}
          height={1080}
          id="MusicVisualizer"
          width={1080}
        />
        <Composition
          component={SiteIntro}
          durationInFrames={7 * fps}
          fps={fps}
          height={1080}
          id="SiteIntro"
          width={1920}
        />
      </Folder>
    </>
  );
}
