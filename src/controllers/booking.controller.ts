import {
  getAllBookings,
  getBooking,
  getMyBookings
} from '../services/booking.service'
import { getTour } from '../services/tour.service'
import { getStripeCheckoutSession } from '../services/stripe.service'
import AppError from '../utils/AppError.utils'
import logger from '../utils/logger.utils'
import type { Request, Response, NextFunction } from 'express'
import type { TQueryFilterByTourId } from '../middleware/setQueryFilterByTourId'
import type { IBookingDocument } from '../types/booking.types'

/** GET Stripe Session */
/**
 * Handles the request to get the Stripe checkout session for a specific tour.
 *
 * @param req - The request object containing the tourId parameter.
 * @param res - The response object.
 * @param next - The next function to call in the middleware chain.
 * @returns A JSON response with the Stripe checkout session.
 */
export const getStripeCheckoutSessionHandler = async (
  req: Request<{ tourId: string }, object, object>,
  res: Response,
  next: NextFunction
) => {
  const {
    params: { tourId }
  } = req

  const currentUser = res.locals.user

  // 1. Get current tour
  const tour = await getTour(tourId)
  if (!tour) {
    return next(new AppError({ statusCode: 404, message: 'Tour not found' }))
  }

  // 2. Create Checkout Session
  const stripeSession = await getStripeCheckoutSession({
    req,
    tour,
    user: currentUser
  })

  // 3. Send Response
  return res.status(200).json({
    status: 'success',
    data: {
      stripeSession
    }
  })
}

/**
 * Retrieves all bookings or bookings filtered by tour ID.
 * GET /api/v1/bookings
 * GET /api/v1/tours/:id/bookings
 *
 * This function performs the following steps:
 * 1. Extracts the query parameters from the request.
 * 2. Retrieves the query filter options from `res.locals.queryFilterByTourId`, which is set by a previous middleware.
 * 3. Calls `getAllBookings` with the query filter options and the query parameters to retrieve the bookings.
 * 4. Returns a JSON response containing the bookings and the count of bookings.
 *
 * @param req - The Express request object. The `query` property should contain the query parameters.
 * @param res - The Express response object. The `locals` property should contain the query filter options.
 * @param next - The next function to call in the middleware chain.
 * @returns A JSON response containing the bookings and the count of bookings.
 * @throws {Error} If an error occurs while retrieving the bookings.
 */
export const getAllBookingsHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { query } = req
    const queryFilterByTourId: TQueryFilterByTourId =
      res?.locals?.queryFilterByTourId

    const bookings: IBookingDocument[] = await getAllBookings({
      queryFilterByTourId,
      query
    })

    return res.status(200).json({
      status: 'success',
      dataCount: bookings?.length,
      data: { bookings }
    })
  } catch (err: unknown) {
    logger.info(err)
    next(err)
  }
}

/**
 * Retrieves a specific booking by its ID.
 * GET /api/v1/bookings/:bookingId
 *
 * This function performs the following checks:
 * 1. Checks if the booking exists. If not, it returns a 404 error.
 * 2. Checks if the current user is an admin.
 * 3. Checks if the current user is the one who made the booking.
 * If the user is neither an admin nor the one who made the booking, it returns a 403 error.
 *
 * @param req - The Express request object. The `params` property should contain the booking ID.
 * @param res - The Express response object. The `locals` property should contain the current user's ID and role.
 * @param next - The next function to call in the middleware chain.
 * @returns A JSON response containing the booking if the user is authorized to view it.
 * @throws {AppError} If the booking is not found or the user is not authorized to view it.
 */
export async function getBookingHandler(
  req: Request<{ bookingId: string }, object, object>,
  res: Response,
  next: NextFunction
) {
  try {
    const { params } = req

    const bookingId: string | undefined = params.bookingId // /bookings/:bookingId
    const currentUserId: string = res.locals.user._id // after requireUser
    const currentUserRole: string = res.locals.user.role // after requireUser

    // 1. Checks if the booking exists.
    const booking: IBookingDocument | null = await getBooking({
      _id: bookingId
    })

    if (!booking) {
      return next(
        new AppError({ statusCode: 404, message: 'Booking not found' })
      )
    }

    // 2. Checks if the current user is Admin
    const userIsAdmin = currentUserRole === 'admin'

    // 3. Checks if the current user is the booker of this booking
    const userIsBooker = booking.user._id.toString() === currentUserId

    if (!userIsAdmin && !userIsBooker) {
      return next(
        new AppError({
          statusCode: 403,
          message:
            'You can only check a booking that you booked yourself, or you need to be Admin'
        })
      )
    }

    return res.status(200).json({
      status: 'success',
      data: { booking }
    })
  } catch (error) {
    logger.info(error)
    next(error)
  }
}

//
export async function getMyBookingsHandler(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = res.locals.user._id

    const bookings: IBookingDocument[] = await getMyBookings(userId)

    return res.status(200).json({
      status: 'success',
      dataCount: bookings?.length,
      data: { bookings }
    })
  } catch (err: unknown) {
    logger.info(err)
    next(err)
  }
}
