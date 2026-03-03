import * as enums from '../constants/enums'
export interface Space {
  id: string
  name: string
  desc: string
  createTime: string
  pwBooks?: PasswordBook[]
}

export interface PasswordBook {
  id: string
  name: string
  desc: string
  createTime: string
  pws?: Password[]
}

export interface Password {
  id: string
  username: string
  password: string
  iv: string
  mask: string
  desc: string
  status: enums.PasswordStatus
  url: string
  sortOrder?: number
  createTime: string
}

export interface Settings {
  defaultSpaceId?: string
  masterPasswordHash?: string
  masterPasswordSalt?: string
}
