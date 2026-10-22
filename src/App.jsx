import BrandList from './components/BrandList.jsx'
import OffersTable from './components/OffersTable.jsx'
import SearchForm from './components/SearchForm.jsx'

function App() {
  return (
    <div className="container py-4">
      <h1 className="h3 mb-4">Поиск запчастей и аналогов</h1>
      <SearchForm />
      <div className="row g-4">
        <div className="col-md-4">
          <BrandList />
        </div>
        <div className="col-md-8">
          <OffersTable />
        </div>
      </div>
    </div>
  )
}

export default App
