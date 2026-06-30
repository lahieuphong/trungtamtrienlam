class CalendarConstants {
  static views = {
    Day: 0,
    Month: 1,
    Week: 2,
  }

  static joinTypes = {
    Office: 0,
    Personal: 1,
  }

  static participateType = {
    Department: 0,
    User: 1,
    Personal: 2,
  }

  static typeEvent = {
    Meeting: 0,
    Collaborate: 1,
    Other: 2,
    Cancel: 3,
    Delete: 4,
    Lock: 5,
    All: 10,
  }

  static eventColor = {
    [this.typeEvent.Meeting]: '#52C41A',
    [this.typeEvent.Collaborate]: '#2F54EB',
    [this.typeEvent.Other]: '#8C8C8C',
    [this.typeEvent.Cancel]: 'orange',
    [this.typeEvent.Delete]: 'red',
    [this.typeEvent.Lock]: 'slate',
  }

  static eventColorMain = {
    [this.typeEvent.Meeting]: '#E6FFFB',
    [this.typeEvent.Collaborate]: '#F0F5FF',
    [this.typeEvent.Other]: '#F5F5F5',
  }

  static viewType = {
    [this.views.Day]: 'day',
    [this.views.Month]: 'month',
    [this.views.Week]: 'week',
  }

  static viewParticipant = {
    Joined: 0,
    Refuse: 1,
    NotYet: 2,
  }

  static userJoin = {
    createBy: 1,
    participant: 2,
    personal: 3,
  }

  static userTypeAccept = {
    accept: 1,
    refuse: 2,
  }

  static calendarFilesType = {
    system: 0,
    share: 1,
  }

  static calendarVersion = {
    v1: 1,
    v2: 2,
  }
}

export { CalendarConstants }
