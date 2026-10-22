import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { searchGoods } from '../api/favorit.js'
import { toBrandList } from '../utils/goods.js'

const initialState = { query: '', requestId: null, items: [], status: 'idle', error: null }

export const fetchBrands = createAsyncThunk('brands/fetch', async (number, { signal }) => {
  const goods = await searchGoods({ number }, signal)
  return toBrandList(goods, number)
})

const brandsSlice = createSlice({
  name: 'brands',
  initialState,
  reducers: {
    clearBrands: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBrands.pending, (state, action) => {
        state.query = action.meta.arg
        state.requestId = action.meta.requestId
        state.status = 'loading'
        state.error = null
      })
      .addCase(fetchBrands.fulfilled, (state, action) => {
        if (action.meta.requestId !== state.requestId) return
        state.items = action.payload
        state.status = 'succeeded'
      })
      .addCase(fetchBrands.rejected, (state, action) => {
        if (action.meta.aborted || action.meta.requestId !== state.requestId) return
        state.items = []
        state.status = 'failed'
        state.error = action.error.message
      })
  },
})

export const { clearBrands } = brandsSlice.actions
export const selectBrands = (state) => state.brands

export default brandsSlice.reducer
