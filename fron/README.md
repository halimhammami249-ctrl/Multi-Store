# Multi-Tenant E-Commerce Admin Platform

A production-ready SaaS admin platform for managing multiple independent online stores from a single installation. Built with Next.js 16, TypeScript, and Tailwind CSS—similar to Shopify Partners, Vercel Dashboard, or Stripe Dashboard.

## Architecture Overview

This is a **multi-tenant platform** where one installation manages many independent online stores with complete data isolation.

### Two-Level Access Model

#### 1. Super Admin (Platform Level)
View and manage all stores on the platform
- **Stores** - Create, edit, delete, and archive stores with one-click access
- **Dashboard** - Platform-wide statistics and analytics
- View: Total Stores, Active Stores, Total Products, Total Variants, Total Inventory, Brands, Categories, Low Stock Items

#### 2. Store Workspace (Store Level)
Dedicated workspace for managing a single store
- **Store Switcher** - Persistent dropdown in top navigation to switch between stores
- **Dashboard** - Store-specific metrics and quick actions
- **Products** - Product catalog without pricing/stock (variants contain those)
- **Inventory** - Variant-level stock management with filters
- **Brands, Categories, Attributes** - Store-specific management
- **Media** - Asset gallery
- **Orders, Customers, Analytics** - Placeholder pages for future features
- **Settings** - Store configuration

## Features

### Store Management
- Grid view of all stores with quick stats
- Store status indicators (active/inactive/archived)
- One-click "Open Store" to enter workspace
- Edit, Delete, Archive actions
- Last updated timestamp
- Products, Variants, Categories, Brands counts

### Products & Inventory
- **Products**: Brand, Category, Variant Count, Price Range, Total Stock, Status, Created Date
- **Variants**: SKU, Product, Attributes, Price, Stock with status filters (Low Stock, Out of Stock)
- Search by product name, SKU, or attributes
- Stock level visualization (green/yellow/red)

### UI/UX Features
- **Dark Theme** - Professional dark palette with teal/cyan accents
- **Responsive Design** - Mobile-first, works on all devices
- **Store Context** - Automatic store ID scoping for all requests
- **Data Tables** - Searchable, sortable with loading states
- **Status Indicators** - Color-coded badges for stock/status
- **Empty States** - Helpful prompts when no store selected

## Technology Stack

- **Frontend**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **State**: React Context (StoreContext) + localStorage
- **UI Components**: shadcn/ui + Lucide icons
- **API**: REST endpoints with mock data

## Data Model

### Products vs Variants
- **Products**: Store-level information (name, brand, category, description, status)
- **Variants**: Specific variants with SKU, Price, Stock, Attributes, Images

All data is automatically scoped to the selected store via `storeId`.

## Project Structure

```
/app
  /api
    /stores/          # List all stores
    /products/        # Products per store
    /categories/      # Categories per store
    /brands/          # Brands per store
    /attributes/      # Attributes per store
    /inventory/       # Variants/inventory per store
    /stats/           # Dashboard stats
  /stores             # Stores management page
  /products           # Store-specific products page
  /categories         # Store-specific categories
  /brands             # Store-specific brands
  /attributes         # Store-specific attributes
  /inventory          # Store-specific inventory
  /media              # Store-specific media
  /settings           # Store-specific settings
  /orders             # Placeholder
  /customers          # Placeholder
  /analytics          # Placeholder
  page.tsx            # Dashboard (platform or store level)
  layout.tsx          # Root layout with StoreProvider

/lib
  store-context.tsx   # Multi-tenant state management

/components
  sidebar-nav.tsx          # Context-aware navigation
  top-bar.tsx             # Header with store switcher
  dashboard-layout.tsx    # Layout wrapper
  stat-card.tsx           # Statistics display
  data-table.tsx          # Reusable data table
```

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install

# Or with npm
npm install
```

### Development

```bash
pnpm dev
# or
npm run dev
```

The application will start at `http://localhost:3000`

### Build & Deploy

```bash
pnpm build
pnpm start
```

## API Endpoints

All endpoints automatically accept and filter by `storeId`:

### Stores (Platform Level)
- `GET /api/stores` - List all stores with metadata

### Products (Store Level)
- `GET /api/products?storeId=...` - List products for a store
- `POST /api/products` - Create a new product

### Categories (Store Level)
- `GET /api/categories` - List categories for a store
- `POST /api/categories` - Create a category

### Brands (Store Level)
- `GET /api/brands` - List brands for a store
- `POST /api/brands` - Create a brand

### Attributes (Store Level)
- `GET /api/attributes` - List attributes for a store
- `POST /api/attributes` - Create an attribute

### Inventory (Store Level)
- `GET /api/inventory?storeId=...` - List variants for a store
- `PUT /api/inventory` - Update variant stock

## Store Context & State Management

The `StoreContext` provides multi-tenant state across the app:

```tsx
// Use the store context in any component
const { selectedStore, stores, setSelectedStore } = useStore()

// Selected store automatically scopes all API requests
// Store selection is persisted in localStorage
```

## Color Scheme

Professional dark theme:
- **Background**: `#0a0e27` - Deep navy
- **Primary**: `#0d9488` - Teal (actions)
- **Accent**: `#06b6d4` - Cyan (highlights)
- **Foreground**: `#e5e7eb` - Light text
- **Destructive**: `#ef4444` - Red (delete)

Edit colors in `/app/globals.css`

## Connecting a Real Backend

The API routes currently return mock data. To connect a production backend:

1. Update API routes in `/app/api/` to call your backend
2. Ensure endpoints accept `storeId` parameter
3. All data queries are already scoped by store
4. Use environment variables:

```env
NEXT_PUBLIC_API_URL=https://your-api.example.com
API_SECRET=your-api-key
```

### Example API Route Integration

```typescript
// /app/api/products/route.ts
export async function GET(request: NextRequest) {
  const storeId = request.nextUrl.searchParams.get('storeId')
  
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/stores/${storeId}/products`,
    { headers: { 'Authorization': `Bearer ${process.env.API_SECRET}` } }
  )
  
  return response.json()
}
```

## Usage Example

### Entering a Store Workspace

```typescript
// In a component
const { setSelectedStore } = useStore()

// Click "Open Store" button
const handleOpenStore = (store: Store) => {
  setSelectedStore(store)
  // Automatically routes to store workspace
  // All subsequent API requests include the store context
}
```

### Creating Store-Scoped API Calls

```typescript
// In any page/component
const { selectedStore } = useStore()

useEffect(() => {
  if (!selectedStore) return // Guard: no store selected
  
  // Fetch is automatically scoped to the selected store
  const response = await fetch(`/api/products?storeId=${selectedStore.id}`)
  const data = await response.json()
}, [selectedStore])
```

## Future Enhancements

- [ ] Real database integration (Neon, Supabase, Aurora, etc.)
- [ ] Authentication (Better Auth, Clerk, Auth.js)
- [ ] User management with role-based access
- [ ] Orders & Customers pages
- [ ] Advanced Analytics & Reporting
- [ ] Product bulk operations
- [ ] CSV/Excel import & export
- [ ] Webhook support for integrations
- [ ] Audit logging
- [ ] Multi-language support
- [ ] API key management for integrations
- [ ] Webhook management and testing

## Performance

- Mobile-first responsive design
- Data table pagination for large datasets
- Lazy loading components
- Optimized CSS with Tailwind
- Client-side state with React Context
- localStorage for store selection persistence

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT

## Support

For issues or feature requests, please open an issue in the repository.
