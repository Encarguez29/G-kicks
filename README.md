# GKICKS E-Commerce System

A modern, full-stack e-commerce platform built with Next.js, featuring user authentication, product management, shopping cart, and admin dashboard.

## 🚀 Features

### Customer Features
- **User Authentication**: Secure login/register with JWT tokens
- **Product Catalog**: Browse shoes by category (Men, Women, Kids)
- **Shopping Cart**: Add/remove items with persistent storage
- **Wishlist**: Save favorite products
- **User Profile**: Manage personal information and avatar
- **Order Management**: View order history and status
- **Address Management**: Multiple shipping addresses
- **AI Chatbot**: Customer support assistance

### Admin Features
- **Dashboard**: Analytics and overview
- **Inventory Management**: Add, edit, delete products
- **Order Management**: Process and track orders
- **User Management**: View and manage customers
- **Staff Management**: Admin user controls
- **POS System**: Point of sale interface
- **MySQL Database**: Direct database management

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Next.js API Routes
- **Database**: MySQL with connection pooling
- **Authentication**: JWT tokens with secure cookies
- **File Upload**: Avatar and product image handling
- **State Management**: React Context API
- **UI Components**: Custom component library

## 📁 Project Structure

```
GKICKS-SHOP-2.0/
├── app/                    # Next.js app directory
│   ├── admin/             # Admin dashboard pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── profile/           # User profile
│   └── [categories]/      # Product category pages
├── components/            # Reusable UI components
├── contexts/              # React context providers
├── database/              # Database setup and migrations
├── lib/                   # Utility functions and configs
├── public/                # Static assets
└── styles/                # Global styles
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MySQL 8.0+
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Ryoushinji3/Gkicks_System.git
   cd Gkicks_System
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Database Setup**
   - Create a MySQL database named `gkicks`
   - Run the setup script:
   ```bash
   mysql -u root -p gkicks < database/mysql-setup.sql
   ```

4. **Environment Configuration**
   Create `.env.local` file:
   ```env
   # Database
   DB_HOST=localhost
   DB_USER=your_mysql_user
   DB_PASSWORD=your_mysql_password
   DB_NAME=gkicks
   
   # JWT Secret
   JWT_SECRET=your_jwt_secret_key
   
   # Next.js
   NEXTAUTH_SECRET=your_nextauth_secret
   NEXTAUTH_URL=http://localhost:3001
   ```

5. **Run the development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

6. **Create admin user**
   ```bash
   node scripts/create-admin.js
   ```

## 📊 Database Schema

The system uses MySQL with the following main tables:
- `users` - User accounts and authentication
- `profiles` - User profile information
- `products` - Product catalog
- `orders` - Order management
- `addresses` - User shipping addresses
- `cart_items` - Shopping cart data
- `wishlist_items` - User wishlists

## 🔐 Authentication

- JWT-based authentication with secure HTTP-only cookies
- Role-based access control (Customer, Admin, Staff)
- Password hashing with bcrypt
- Session management with token refresh

## 🎨 UI/UX Features

- Responsive design for all devices
- Dark/light theme support
- Modern component library with shadcn/ui
- Loading states and error handling
- Toast notifications
- Smooth animations and transitions

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables
Ensure all production environment variables are set:
- Database connection strings
- JWT secrets
- File upload paths
- API endpoints

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Contact the development team

## 🔄 Version History

- **v2.0** - Complete rewrite with Next.js 14, MySQL integration
- **v1.0** - Initial release with basic e-commerce features

---

**GKICKS** - Your premium shoe shopping destination 👟