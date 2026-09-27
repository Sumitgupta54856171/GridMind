import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { Utility } from '@/api/utilities'

interface UtilitiesState {
  selected: string[] // ids selected for analysis
}

const initialState: UtilitiesState = {
  selected: [],
}

const utilitiesSlice = createSlice({
  name: 'utilities',
  initialState,
  reducers: {
    toggleSelected(state, action: PayloadAction<string>) {
      const id = action.payload
      const idx = state.selected.indexOf(id)
      if (idx === -1) {
        state.selected.push(id)
      } else {
        state.selected.splice(idx, 1)
      }
    },
    clearSelected(state) {
      state.selected = []
    },
  },
})

export const { toggleSelected, clearSelected } = utilitiesSlice.actions
export default utilitiesSlice.reducer
// Re-export type for convenience
export type { Utility }
