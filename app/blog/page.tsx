// app/blog/page.tsx
export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A1D37] to-[#0F3460] text-white pt-20">
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Our <span className="text-gradient">Blog</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Insights, tips, and updates from the world of digital innovation
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-12 border border-gray-700">
            <div className="text-6xl mb-4">📝</div>
            <h2 className="text-2xl font-bold mb-4">Blog Coming Soon</h2>
            <p className="text-gray-400 mb-6">
              We're working hard to bring you valuable content about web development, 
              digital marketing, and industry insights. Stay tuned!
            </p>
            <button className="bg-gradient-to-r from-[#007BFF] to-[#00BFFF] text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg hover:shadow-blue-500/30 transition-all">
              Notify Me When Live
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}