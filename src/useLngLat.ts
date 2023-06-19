import { reactive } from "vue";

/**
 * 获取用户设备的经纬度
 * @param sync 是否同步获取，默认为 true
 * @returns 包含经纬度和同步方法的对象
 */
export const useLngLat = (sync = true) => {
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
