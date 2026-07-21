import styles from "./loading.module.css";

export default function Loading() {
  return (
    <div className={styles.loading} role="status" aria-label="Loading page">
      <span>Nomu</span>
      <i aria-hidden="true" />
    </div>
  );
}
