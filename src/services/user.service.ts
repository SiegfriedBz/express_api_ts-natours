import { omit } from 'lodash'
import User, { IUserDocument } from '../models/user.model'
import AppError from '../utils/AppError.utils'
import type { TCreateUserInput } from '../zodSchema/user.zodSchema'
import type { Types } from 'mongoose'

export async function getUser(userId: Types.ObjectId) {
  const user = await User.findById(userId)

  return user
}

export async function createUser(inputData: TCreateUserInput['body']) {
  try {
    const newUser = await User.create(inputData)

    return omit(newUser.toJSON(), 'password')
  } catch (err: unknown) {
    if (err instanceof Error) {
      throw new AppError({ statusCode: 409, message: err.message })
    } else {
      throw err
    }
  }
}

export async function checkPassword({
  email,
  password
}: {
  email: string
  password: string
}): Promise<Omit<IUserDocument, 'password' | 'comparePassword'> | null> {
  const user = await User.findOne({ email })

  if (!user) {
    return null
  }

  const isValid = await (user as IUserDocument).comparePassword(password)
  if (!isValid) {
    return null
  }

  const userWithoutPassword = user.toObject({
    transform: (doc, ret) => {
      delete ret.password
      delete ret.comparePassword
      return ret
    }
  }) as Omit<IUserDocument, 'password' | 'comparePassword'>

  return userWithoutPassword
}
