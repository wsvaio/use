import { onBeforeUnmount } from "vue";

export const useCreateObjectURL = () => {
  const urls: string[] = [];
  onBeforeUnmount(() => {
    urls.forEach(url => URL.revokeObjectURL(url));
  });
  return {
    createObjectURL: (obj: Blob | MediaSource) => {
      const url = URL.createObjectURL(obj);
      urls.push(url);
      return url;
    },
  };
};
