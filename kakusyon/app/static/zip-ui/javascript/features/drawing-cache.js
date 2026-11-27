export function openDrawingCache(id) {
  return new Promise((resolve, reject) => {
    const opening = indexedDB.open("kakusyon-drawings", 1);
    opening.onupgradeneeded = () => opening.result.createObjectStore("drawings");
    opening.onerror = () => reject(opening.error);
    opening.onsuccess = () => {
      const db = opening.result;
      function run(mode, operation) {
        return new Promise((done, fail) => {
          const tx = db.transaction("drawings", mode);
          const request = operation(tx.objectStore("drawings"));
          tx.oncomplete = () => done(request.result);
          tx.onabort = () => fail(tx.error);
        });
      }
      resolve({
        read: () => run("readonly", store => store.get(id)),
        write: state => run("readwrite", store => store.put(state,id)),
        clear: () => run("readwrite", store => store.delete(id))
      });
    };
  });
}
