const nf5 = new Intl.NumberFormat('en-US', { minimumIntegerDigits: 5, useGrouping: false });

export const format5 = (n: number | string) => nf5.format(Number(n));