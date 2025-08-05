import { GetServerSideProps } from 'next'
import Head from 'next/head'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useQuery } from 'react-query'
import { apiService } from '../lib/api'

interface Post {
  id: number
  title: string
  slug: string
  excerpt: string
  content: string
  featuredImage?: string
  publishedAt: string
  viewsCount: number
  likesCount: number
  readingTime: number
  author: {
    id: number
    username: string
    firstName: string
    lastName: string
    avatar?: string
  }
  category?: {
    id: number
    name: string
    slug: string
    color?: string
  }
  tags: Array<{
    id: number
    name: string
    slug: string
    color?: string
  }>
}

interface HomePageProps {
  initialPosts: Post[]
  categories: any[]
  settings: any
}

export default function HomePage({ initialPosts, categories, settings }: HomePageProps) {
  const [currentPage, setCurrentPage] = useState(1)

  // Obtener posts con paginación
  const { data: postsData, isLoading } = useQuery(
    ['posts', currentPage],
    () => apiService.posts.getAll({ 
      page: currentPage, 
      limit: 6,
      status: 'published',
      type: 'post'
    }),
    {
      initialData: currentPage === 1 ? { data: { posts: initialPosts } } : undefined,
      keepPreviousData: true
    }
  )

  const posts = postsData?.data.data.posts || []
  const pagination = postsData?.data.data.pagination

  return (
    <>
      <Head>
        <title>{settings.site_title || 'Mi CMS'}</title>
        <meta name="description" content={settings.site_description || 'Un CMS potente y flexible'} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-secondary-50 to-primary-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-secondary-200 sticky top-0 z-40">
          <div className="container-custom">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <Link href="/" className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors">
                  {settings.site_title || 'Mi CMS'}
                </Link>
              </div>

              <nav className="hidden md:flex items-center space-x-6">
                <Link href="/" className="text-secondary-600 hover:text-primary-600 transition-colors">
                  Inicio
                </Link>
                {categories.slice(0, 5).map((category) => (
                  <Link 
                    key={category.id}
                    href={`/category/${category.slug}`}
                    className="text-secondary-600 hover:text-primary-600 transition-colors"
                  >
                    {category.name}
                  </Link>
                ))}
                <Link href="/admin/dashboard" className="btn btn-primary">
                  Panel Admin
                </Link>
              </nav>

              <div className="md:hidden">
                <button className="text-secondary-600 hover:text-primary-600">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="section-padding">
          <div className="container-custom text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-secondary-900 mb-6">
              Bienvenido a nuestro
              <span className="block text-primary-600">CMS Completo</span>
            </h1>
            <p className="text-lg md:text-xl text-secondary-600 max-w-3xl mx-auto mb-8">
              {settings.site_description || 'Un sistema de gestión de contenido potente y flexible construido con Node.js, Next.js y Tailwind CSS.'}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="#posts" className="btn btn-primary text-lg px-8 py-3">
                Ver Artículos
              </Link>
              <Link href="/admin/dashboard" className="btn btn-outline text-lg px-8 py-3">
                Panel de Admin
              </Link>
            </div>
          </div>
        </section>

        {/* Posts Section */}
        <section id="posts" className="section-padding bg-white/50">
          <div className="container-custom">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-secondary-900 mb-4">
                Últimos Artículos
              </h2>
              <p className="text-lg text-secondary-600 max-w-2xl mx-auto">
                Descubre nuestro contenido más reciente y mantente actualizado con las últimas noticias y artículos.
              </p>
            </div>

            {isLoading && currentPage > 1 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="loading-skeleton h-48 rounded-lg mb-4"></div>
                    <div className="loading-skeleton h-4 rounded mb-2"></div>
                    <div className="loading-skeleton h-4 rounded w-3/4 mb-4"></div>
                    <div className="loading-skeleton h-3 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {posts.map((post) => (
                  <article key={post.id} className="card hover:shadow-medium transition-shadow group">
                    {post.featuredImage && (
                      <div className="relative overflow-hidden rounded-lg mb-4">
                        <img
                          src={post.featuredImage}
                          alt={post.title}
                          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {post.category && (
                          <span 
                            className="absolute top-3 left-3 badge text-white text-xs"
                            style={{ backgroundColor: post.category.color || '#3B82F6' }}
                          >
                            {post.category.name}
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center text-sm text-secondary-500 mb-2">
                      <img
                        src={post.author.avatar || `https://ui-avatars.com/api/?name=${post.author.firstName}+${post.author.lastName}&background=3B82F6&color=fff`}
                        alt={`${post.author.firstName} ${post.author.lastName}`}
                        className="w-6 h-6 rounded-full mr-2"
                      />
                      <span>{post.author.firstName} {post.author.lastName}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(post.publishedAt).toLocaleDateString('es-ES')}</span>
                      <span className="mx-2">•</span>
                      <span>{post.readingTime} min lectura</span>
                    </div>

                    <h3 className="text-xl font-semibold text-secondary-900 mb-3 group-hover:text-primary-600 transition-colors">
                      <Link href={`/post/${post.slug}`}>
                        {post.title}
                      </Link>
                    </h3>

                    <p className="text-secondary-600 line-clamp-3 mb-4">
                      {post.excerpt}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-secondary-500">
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          {post.viewsCount}
                        </span>
                        <span className="flex items-center">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                          </svg>
                          {post.likesCount}
                        </span>
                      </div>

                      <Link href={`/post/${post.slug}`} className="text-primary-600 hover:text-primary-700 font-medium">
                        Leer más →
                      </Link>
                    </div>

                    {post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {post.tags.slice(0, 3).map((tag) => (
                          <span 
                            key={tag.id}
                            className="badge badge-secondary text-xs"
                            style={{ backgroundColor: tag.color ? `${tag.color}20` : undefined, color: tag.color }}
                          >
                            #{tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex justify-center mt-12">
                <nav className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="btn btn-outline px-3 py-2 disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  {[...Array(pagination.totalPages)].map((_, i) => {
                    const page = i + 1
                    if (
                      page === 1 ||
                      page === pagination.totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 rounded-md transition-colors ${
                            page === currentPage
                              ? 'bg-primary-600 text-white'
                              : 'text-secondary-600 hover:bg-secondary-100'
                          }`}
                        >
                          {page}
                        </button>
                      )
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return <span key={page} className="px-2">...</span>
                    }
                    return null
                  })}

                  <button
                    onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={currentPage === pagination.totalPages}
                    className="btn btn-outline px-3 py-2 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </nav>
              </div>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-secondary-900 text-secondary-300 section-padding">
          <div className="container-custom">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <h3 className="text-2xl font-bold text-white mb-4">
                  {settings.site_title || 'Mi CMS'}
                </h3>
                <p className="text-secondary-400 mb-4">
                  {settings.site_description || 'Un CMS potente y flexible construido con tecnologías modernas.'}
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Categorías</h4>
                <ul className="space-y-2">
                  {categories.slice(0, 5).map((category) => (
                    <li key={category.id}>
                      <Link href={`/category/${category.slug}`} className="hover:text-primary-400 transition-colors">
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-white mb-4">Enlaces</h4>
                <ul className="space-y-2">
                  <li>
                    <Link href="/admin/dashboard" className="hover:text-primary-400 transition-colors">
                      Panel de Admin
                    </Link>
                  </li>
                  <li>
                    <Link href="/auth/login" className="hover:text-primary-400 transition-colors">
                      Iniciar Sesión
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-secondary-700 mt-8 pt-8 text-center">
              <p>&copy; {new Date().getFullYear()} {settings.site_title || 'Mi CMS'}. Todos los derechos reservados.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async () => {
  try {
    // Obtener datos iniciales del servidor
    const [postsResponse, categoriesResponse, settingsResponse] = await Promise.all([
      apiService.posts.getAll({ limit: 6, status: 'published', type: 'post' }),
      apiService.categories.getAll({ includeEmpty: false }),
      apiService.settings.getAll({ isPublic: true })
    ])

    return {
      props: {
        initialPosts: postsResponse.data.data.posts || [],
        categories: categoriesResponse.data.data.categories || [],
        settings: settingsResponse.data.data.settingsObject || {}
      }
    }
  } catch (error) {
    console.error('Error fetching initial data:', error)
    return {
      props: {
        initialPosts: [],
        categories: [],
        settings: {}
      }
    }
  }
}