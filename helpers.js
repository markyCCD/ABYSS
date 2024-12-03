import path from "path";

/**
 * Get the filename without ?hash
 * @param fileName file name
 */
export function getCanonicalFilename(fileName) {
  if (fileName.includes("?")) {
    return fileName.split("?").slice(0, -1).join("");
  }
  return fileName;
}

/**
 * Returns true if the filename is of types of one of the specified extensions
 * @param filename file name
 * @param extensions extensions
 */
export function isFileOfTypes(filename, extensions) {
  const extension = path.extname(getCanonicalFilename(filename)).toLowerCase();
  return extensions.includes(extension);
}

/**
 * Returns true if the filename is a stylesheet
 * @param filename file name
 */
export function isStylesheet(filename) {
  return isFileOfTypes(filename, [".css"]);
}

/**
 * Returns true if the filename is a data URI
 * @param filename file name
 */
export function isDataUri(filename) {
  return filename.trim().toLowerCase().startsWith('data:');
};
