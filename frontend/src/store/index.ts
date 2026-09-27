import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import utilitiesReducer from './slices/utilitiesSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    utilities: utilitiesReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
