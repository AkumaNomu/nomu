import Image from "next/image";
import styles from "./FolderCover.module.css";

export function FolderCover({ covers }: { covers: readonly string[] }) {
  return (
    <span className={styles.folder} aria-hidden="true">
      <span className={styles.back}>
        {covers.slice(0, 3).map((src, index) => (
          <span key={`${src}-${index}`} className={styles.paper}>
            <Image src={src} alt="" fill sizes="(max-width: 767px) 20vw, 8vw" />
          </span>
        ))}
        <span className={styles.front} />
        <span className={`${styles.front} ${styles.right}`} />
      </span>
    </span>
  );
}
