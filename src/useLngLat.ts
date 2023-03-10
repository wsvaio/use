import { reactive } from "vue";

export default (sync = true) => {
  const lnglat = reactive([0, 0]);
  const syncLnglat = () => {
    navigator.geolocation.getCurrentPosition(ev => {
      lnglat[0] = ev.coords.longitude;
      lnglat[1] = ev.coords.latitude;
    });
  };
  sync && syncLnglat();
  return {
    lnglat,
    syncLnglat,
  };
};
