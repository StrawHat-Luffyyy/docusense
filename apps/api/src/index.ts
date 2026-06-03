import express , {Request , Response} from 'express'


const app = express()
const PORT = process.env.PORT || 4000

app.use(express.json())

app.get('/api/health' , (req: Request , res: Response) => {
  res.status(200).json({
    status : 'success',
    timestamp : new Date().toISOString(),
    service : '@docusense/api'
  })
})

app.listen(PORT , () => {
  console.log(`API Server running on http://localhost:${PORT}`)
})