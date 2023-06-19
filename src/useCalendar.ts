import { ref, watchEffect } from "vue";

/**
 * 封装日历相关数据和方法的钩子函数
 * @returns 包含年、月、前一月天数、当前月天数、后一月天数、当前首月星期数、日期格式化方法的对象
 */
export const useCalendar = () => {
	// 年份
	let year = ref(new Date().getFullYear());
	// 月份
	let month = ref(new Date().getMonth());
	// 前一月结束日期
	let beforeMonthEndDay = ref(0);
	// 当前月结束日期
	let currMonthEndDay = ref(0);
	// 后一月结束日期
	let afterMonthEndDay = ref(0);
	// 当前月开始星期数
	let currMonthStartWeek = ref(0);

	// 监听年份和月份的变化
	watchEffect(() => {
		if (month.value >= 12) {
			month.value = 0;
			year.value++;
		}
		else if (month.value <= -1) {
			month.value = 11;
			year.value--;
		}
	});

	// 监听前一月结束日期的变化
	watchEffect(() => {
		const date = new Date();
		date.setFullYear(year.value);
		date.setMonth(month.value);
		date.setDate(0);
		beforeMonthEndDay.value = date.getDate();
	});

	// 监听当前月结束日期的变化
	watchEffect(() => {
		const date = new Date();
		let m = month.value + 1;
		if (m >= 12) {
			m = 0;
			date.setFullYear(year.value + 1);
		}
		else {
			date.setFullYear(year.value);
		}
		date.setMonth(m);
		date.setDate(0);
		currMonthEndDay.value = date.getDate();
	});
	// 监听后一月结束日期的变化
	watchEffect(() => {
		const date = new Date();
		let m = month.value + 2;
		if (m >= 12) {
			m = m - 12;
			date.setFullYear(year.value + 1);
		}
		else {
			date.setFullYear(year.value);
		}
		date.setMonth(m);
		date.setDate(0);
		afterMonthEndDay.value = date.getDate();
	});
	// 监听当前月开始星期数的变化
	watchEffect(() => {
		const date = new Date();
		date.setFullYear(year.value);
		date.setMonth(month.value);
		date.setDate(1);
		currMonthStartWeek.value = date.getDay();
	});

	/**
	 * 格式化日期数字，根据当前月开始星期数和日期数字计算出实际日期
	 * @param num 日期数字
	 * @returns 格式化后的日期数字
	 */
	const dayNumFormat = (num: number) => {
		num = num - currMonthStartWeek.value;
		if (num <= 0) num = beforeMonthEndDay.value + num;
		else if (num > currMonthEndDay.value) num = num - currMonthEndDay.value;
		return num;
	};

	return {
		year,
		month,
		beforeMonthEndDay,
		currMonthEndDay,
		afterMonthEndDay,
		currMonthStartWeek,
		dayNumFormat,
	};
};
