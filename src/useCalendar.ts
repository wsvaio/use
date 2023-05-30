import { ref, watchEffect } from "vue";

export default () => {
	let year = ref(new Date().getFullYear());
	let month = ref(new Date().getMonth());
	let beforeMonthEndDay = ref(0);
	let currMonthEndDay = ref(0);
	let afterMonthEndDay = ref(0);
	let currMonthStartWeek = ref(0);

	// 年与月的关系
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

	// 前一月天数
	watchEffect(() => {
		const date = new Date();
		date.setFullYear(year.value);
		date.setMonth(month.value);
		date.setDate(0);
		beforeMonthEndDay.value = date.getDate();
	});

	// 当前月天数
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
	// 后一月天数
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
	// 当前首月星期数
	watchEffect(() => {
		const date = new Date();
		date.setFullYear(year.value);
		date.setMonth(month.value);
		date.setDate(1);
		currMonthStartWeek.value = date.getDay();
	});

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
