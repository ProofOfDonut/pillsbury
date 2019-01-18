export class DonutDelivery {
  id: string;
  from: string;
  amount: number;
  date: Date;

  constructor(id: string, from: string, amount: number, date: Date) {
    this.id = id;
    this.from = from;
    this.amount = amount;
    this.date = date;
  }
}
