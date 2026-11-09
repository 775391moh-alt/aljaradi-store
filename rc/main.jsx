
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    image_url: '',
    category_id: ''
  });

  async function loadData() {
    setLoading(true);
    setMessage('');

    const [productsResult, categoriesResult] = await Promise.all([
      supabase.from('products').select('*').order('created_at', {
        ascending: false
      }),
      supabase.from('categories').select('*').order('name')
    ]);

    if (productsResult.error) {
      setMessage('تعذر تحميل المنتجات: ' + productsResult.error.message);
    } else {
      setProducts(productsResult.data || []);
    }

    if (categoriesResult.error) {
      setMessage('تعذر تحميل الأقسام: ' + categoriesResult.error.message);
    } else {
      setCategories(categoriesResult.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateForm(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  }

  async function addProduct(e) {
    e.preventDefault();

    if (!form.name.trim() || !form.price) {
      setMessage('يرجى إدخال اسم المنتج والسعر');
      return;
    }

    setSaving(true);
    setMessage('');

    const product = {
      name: form.name.trim(),
      description: form.description,
      price: Number(form.price),
      stock: Number(form.stock || 0),
      image_url: form.image_url || null,
      category_id: form.category_id || null
    };

    const { error } = await supabase
      .from('products')
      .insert([product]);

    if (error) {
      setMessage('لم تتم إضافة المنتج: ' + error.message);
    } else {
      setMessage('تمت إضافة المنتج بنجاح');
      setForm({
        name: '',
        description: '',
        price: '',
        stock: '',
        image_url: '',
        category_id: ''
      });
      await loadData();
    }

    setSaving(false);
  }

  async function deleteProduct(id) {
    if (!window.confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage('تعذر حذف المنتج: ' + error.message);
    } else {
      setMessage('تم حذف المنتج');
      await loadData();
    }
  }

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' ||
      String(product.category_id) === String(categoryFilter);

    return matchesSearch && matchesCategory;
  });

  const money = (value) =>
    Number(value || 0).toLocaleString('en-US') + ' ر.ي';

  return (
    <div dir="rtl" className="app">

      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Tahoma, Arial, sans-serif;
          background: #f4f7f2;
          color: #24352b;
        }

        .app {
          min-height: 100vh;
        }

        .header {
          background: #176b3a;
          color: white;
          padding: 25px 18px;
          text-align: center;
        }

        .header h1 {
          margin: 0 0 8px;
          font-size: 27px;
        }

        .header p {
          margin: 0;
          color: #e0f2e5;
        }

        .container {
          width: 94%;
          max-width: 1100px;
          margin: 25px auto;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 22px;
        }

        .stat {
          background: white;
          border-radius: 12px;
          padding: 18px;
          text-align: center;
          box-shadow: 0 2px 8px #0000000b;
        }

        .stat strong {
          display: block;
          color: #176b3a;
          font-size: 25px;
          margin-bottom: 5px;
        }

        .panel {
          background: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 22px;
          box-shadow: 0 2px 8px #0000000b;
        }

        .panel h2 {
          color: #176b3a;
          font-size: 20px;
          margin-top: 0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        input, select, textarea {
          width: 100%;
          padding: 13px;
          border: 1px solid #d8e1d9;
          border-radius: 8px;
          font-size: 15px;
          background: white;
          font-family: inherit;
          min-width: 0;
        }

        textarea {
          grid-column: 1 / -1;
          resize: vertical;
        }

        button {
          border: none;
          border-radius: 8px;
          padding: 13px 18px;
          font-size: 15px;
          font-family: inherit;
          cursor: pointer;
        }

        .primary {
          background: #176b3a;
          color: white;
          width: 100%;
          margin-top: 14px;
        }

        .primary:disabled {
          opacity: .6;
        }

        .search {
          margin-bottom: 12px;
        }

        .products {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
          gap: 15px;
        }

        .product {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e5ebe5;
        }

        .product img {
          width: 100%;
          height: 155px;
          object-fit: cover;
          background: #edf3ed;
        }

        .product-info {
          padding: 14px;
        }

        .product h3 {
          margin: 0 0 8px;
          font-size: 17px;
        }

        .price {
          color: #176b3a;
          font-weight: bold;
          font-size: 18px;
        }

        .description {
          color: #69766c;
          font-size: 13px;
        }

        .delete {
          background: #fce8e8;
          color: #b42318;
          width: 100%;
          margin-top: 10px;
        }

        .message {
          background: #e8f5e9;
          color: #176b3a;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 15px;
          overflow-wrap: anywhere;
        }

        .empty {
          text-align: center;
          padding: 30px;
          color: #777;
          background: white;
          border-radius: 12px;
        }

        .footer {
          text-align: center;
          padding: 25px;
          color: #718071;
        }

        @media (max-width: 600px) {
          .form-grid {
            grid-template-columns: 1fr;
          }

          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .header h1 {
            font-size: 23px;
          }
        }
      `}</style>

      <header className="header">
        <h1>🍎 متجر الجرادي</h1>
        <p>للخضار والفواكه الطازجة</p>
        <p>جودة طازجة وأسعار مناسبة</p>
      </header>

      <main className="container">

        <div className="stats">
          <div className="stat">
            <strong>{products.length}</strong>
            عدد المنتجات
          </div>

          <div className="stat">
            <strong>{categories.length}</strong>
            عدد الأقسام
          </div>
        </div>

        {message && (
          <div className="message">{message}</div>
        )}

        <section className="panel">
          <h2>➕ إضافة منتج جديد</h2>

          <form onSubmit={addProduct}>
            <div className="form-grid">

              <input
                name="name"
                placeholder="اسم المنتج"
                value={form.name}
                onChange={updateForm}
                required
              />

              <input
                name="price"
                type="number"
                min="0"
                placeholder="السعر بالريال اليمني"
                value={form.price}
                onChange={updateForm}
                required
              />

              <input
                name="stock"
                type="number"
                min="0"
                placeholder="الكمية المتوفرة"
                value={form.stock}
                onChange={updateForm}
              />

              <select
                name="category_id"
                value={form.category_id}
                onChange={updateForm}
              >
                <option value="">اختر القسم</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <input
                name="image_url"
                placeholder="رابط صورة المنتج"
                value={form.image_url}
                onChange={updateForm}
              />

              <textarea
                name="description"
                placeholder="وصف المنتج"
                rows="3"
                value={form.description}
                onChange={updateForm}
              />

            </div>

            <button className="primary" type="submit" disabled={saving}>
              {saving ? 'جارٍ الحفظ...' : 'حفظ المنتج'}
            </button>
          </form>
        </section>

        <section className="panel">
          <h2>🛒 منتجات المتجر</h2>

          <input
            className="search"
            placeholder="ابحث عن منتج..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">جميع الأقسام</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </section>

        {loading ? (
          <div className="empty">جارٍ تحميل المنتجات...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="empty">
            لا توجد منتجات لعرضها حالياً
          </div>
        ) : (
          <div className="products">
            {filteredProducts.map((product) => (
              <article className="product" key={product.id}>

                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                  />
                ) : (
                  <div style={{
                    height: 155,
                    display: 'grid',
                    placeItems: 'center',
                    background: '#edf3ed',
                    fontSize: 42
                  }}>
                    🍎
                  </div>
                )}

                <div className="product-info">
                  <h3>{product.name}</h3>

                  <div className="price">
                    {money(product.price)}
                  </div>

                  <p className="description">
                    {product.description}
                  </p>

                  <p>
                    الكمية: {product.stock ?? 0}
                  </p>

                  <button
                    className="delete"
                    onClick={() => deleteProduct(product.id)}
                  >
                    حذف المنتج
                  </button>
                </div>

              </article>
            ))}
          </div>
        )}

      </main>

      <footer className="footer">
        جميع الحقوق محفوظة © متجر الجرادي للخضار والفواكه
      </footer>

    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
