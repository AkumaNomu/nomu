import Image from "next/image";
import styles from "./FolderCover.module.css";

export function FolderCover({ covers }: { covers: readonly string[] }) {
  return (
    <span className={styles.folder} aria-hidden="true">
      <span className={styles.mini}>
        {covers.slice(0, 4).map((src, index) => (
          <Image key={`${src}-${index}`} src={src} alt="" width={120} height={75} sizes="(max-width: 767px) 20vw, 6vw" />
        ))}
      </span>
    </span>
  );
}
