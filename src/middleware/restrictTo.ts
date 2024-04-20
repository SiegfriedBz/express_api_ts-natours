import AppError from '../utils/AppError.utils'
import type { Request, Response, NextFunction } from 'express'
import type { IUserDocument, TUserRole } from '../types/user.types'

/**
 * Restricts access to certain roles.
 *
 * @param roles - An array of roles that are allowed to access the restricted resource.
 * @returns A middleware function that checks if the current user has one of the allowed roles.
 */
export default function restrictTo(...roles: TUserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // after deserializeAndRefreshUser middleware
    const currentUser = res.locals.user as IUserDocument
    const currentUserRole = currentUser.role

    if (!roles.includes(currentUserRole)) {
      return next(
        new AppError({
          statusCode: 403,
          message: `Unauthorized - You don't have permissions. Access restricted to ${roles.join(
            ', '
          )}.`
        })
      )
    }
    next()
  }
}
