import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { searchGoods } from '../api/favorit.js'
import { toOfferRows } from '../utils/goods.js'
import { clearBrands, fetchBrands } from './brandsSlice.js'

const initialState = { selected: null, requestId: null, items: [], status: 'idle', error: null }

export const fetchOffers = createAsyncThunk(
  'offers/fetch',
  async ({ brand, number }, { signal }) => {
    const goods = await searchGoods({ brand, number }, signal)
    return toOfferRows(goods)
  }
)

const offersSlice = createSlice({
  name: 'offers',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrands.pending, () => initialState)
      .addCase(clearBrands, () => initialState)
      .addCase(fetchOffers.pending, (state, action) => {
        state.selected = action.meta.arg
        state.requestId = action.meta.requestId
        state.items = []
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchOffers.fulfilled, (state, action) => {
        // после сброса requestId равен null, так что запоздавший ответ сюда не попадёт
        if (action.meta.requestId !== state.requestId) return
        state.items = action.payload
        state.status = 'succeeded'
      })
      .addCase(fetchOffers.rejected, (state, action) => {
        if (action.meta.aborted || action.meta.requestId !== state.requestId) return
        state.status = 'failed'
        state.error = action.error.message
      })
  },
})

export const selectOffers = (state) => state.offers

export default offersSlice.reducer
