import React from "react";
import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Language } from "../../types";

interface BlogPreviewProps {
  language: Language;
  latestPosts: any[];
}

const BlogPreview: React.FC<BlogPreviewProps> = ({ language, latestPosts }) => {
  if (latestPosts.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-6 py-24 reveal-on-scroll">
      <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
        <div>
          <span className="text-[#ff477b] text-xs font-bold uppercase tracking-widest block mb-4">
            {language === "es" ? "Contenido Estratégico" : "Strategic Content"}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-100">
            {language === "es" ? "Insights de Elite" : "Elite Insights"}
          </h2>
        </div>
        <a
          href="/blog"
          onClick={(e) => {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent("nav-to-blog"));
          }}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-bold group"
        >
          {language === "es" ? "Ver todo" : "View all"}
          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {latestPosts.map((post, i) => (
          <motion.a
            key={post.id}
            href={`/blog/${post.slug || post.id}`}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.8 }}
            onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent("nav-to-blog", { detail: post }));
            }}
            className="group cursor-pointer block"
          >
            <div className="aspect-[16/10] rounded-2xl overflow-hidden mb-6 border border-white/5 relative bg-[#1a0b10]">
              {post.featuredImage && (
                <img src={post.featuredImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 opacity-50 group-hover:opacity-100" alt={post.title} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0507] via-transparent to-transparent opacity-60" />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 bg-[#ff477b]/20 backdrop-blur-xl rounded-full text-[11px] font-black uppercase text-white border border-[#ff477b]/30 tracking-widest">
                  {post.category}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 mb-3 text-[11px] text-slate-500 font-bold uppercase tracking-widest">
              <span>{post.authorName}</span>
              <div className="w-1 h-1 rounded-full bg-slate-700" />
              <span>{post.readingTime || "5 MIN READ"}</span>
            </div>
            <h3 className="text-lg font-bold mb-3 group-hover:text-[#ff477b] transition-colors line-clamp-2 leading-tight">
              {post.title}
            </h3>
            <p className="text-slate-400 text-sm line-clamp-2 leading-relaxed opacity-70 group-hover:opacity-100 transition-opacity">
              {post.excerpt}
            </p>
          </motion.a>
        ))}
      </div>
    </section>
  );
};

export default BlogPreview;
