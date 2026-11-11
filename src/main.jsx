
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const WHATSAPP = '967775391755';
const ADMIN_UID = '1f44acd9-5c17-4ee5-8249-408fa7bcd3b4';

const productImages = {
  'طماطم': 'https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600',
  'بطاطس': 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600',
  'بصل': 'https://images.unsplash.com/photo-1508747703725-719777637510?w=600',
  'خيار': 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=600',
  'جزر': 'https://images.unsplash.com/photo-1445282768818-728615cc910a?w=600',
  'موز': 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600',
  'تفاح': 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600',
  'برتقال': 'https://images.unsplash.com/photo-1547514701-42782101795e?w=600',
  'عنب': 'https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=600'
};

function ProductImage({ product }) {
  const [failed, setFailed] = useState(false);
  const src = product.image_url || productImages[product.name];

  if (!src || failed) {
    return (
      <div className="product-image-placeholder">
        🍎
      </div>
    );
  }

  return (
    <img
      className="product-image"
      src={src}
      alt={product.name}
      onError={() => setFailed(true)}
    />
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [session, setSession] = useState(null);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
const [adminEmail, setAdminEmail] = useState('');
const [adminPassword, setAdminPassword] = useState('');

const isAdmin = session?.user?.id === ADMIN_UID;
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

    const [pr, cr] = await Promise.all([
      supabase.from('products').select('*').order('created_at', {
        ascending: false
      }),
      supabase.from('categories').select('*').order('name')
    ]);

    if (pr.error) {
      setMessage('خطأ تحميل المنتجات: ' + pr.error.message);
    } else {
      setProducts(pr.data || []);
    }

    if (cr.error) {
      setMessage('خطأ تحميل الأقسام: ' + cr.error.message);
    } else {
      setCategories(cr.data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);
useEffect(() => {
  let active = true;

  supabase.auth.getSession().then(({ data }) => {
    if (active) {
      setSession(data.session);
    }
  });

  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange((_event, newSession) => {
    if (!active) return;

    setSession(newSession);

    if (newSession?.user?.id !== ADMIN_UID) {
      setShowAdmin(false);
    }
  });

  return () => {
    active = false;
    subscription.unsubscribe();
  };
}, []);
  const money = (value) =>
    Number(value || 0).toLocaleString('en-US') + ' ر.ي';

  function updateForm(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  }

  async function addProduct(e) {
    e.preventDefault();
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
      setMessage('تعذرت الإضافة: ' + error.message);
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
    if (!window.confirm('هل تريد حذف المنتج؟')) return;

    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) {
      setMessage(error.message);
    } else {
      setCart(old => old.filter(item => item.id !== id));
      setMessage('تم حذف المنتج');
      await loadData();
    }
  }

  function addToCart(product) {
    if (Number(product.stock || 0) <= 0) {
      setMessage('عذراً، المنتج غير متوفر حالياً');
      return;
    }

    setCart(old => {
      const found = old.find(item => item.id === product.id);

      if (found) {
        return old.map(item =>
          item.id === product.id
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + 1,
                  Number(product.stock)
                )
              }
            : item
        );
      }

      return [...old, { ...product, quantity: 1 }];
    });

    setMessage('تمت إضافة ' + product.name + ' إلى السلة');
  }

  function changeQuantity(id, amount) {
    setCart(old =>
      old.map(item =>
        item.id === id
          ? {
              ...item,
              quantity: Math.max(
                0,
                Math.min(
                  item.quantity + amount,
                  Number(item.stock || 0)
                )
              )
            }
          : item
      ).filter(item => item.quantity > 0)
    );
  }

  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity, 0
  );

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity, 0
  );

  function checkout() {
    if (!cart.length) {
      setMessage('السلة فارغة، أضف المنتجات أولاً');
      return;
    }

    const customer = window.prompt('اكتب اسمك لإتمام الطلب:');
    if (!customer || !customer.trim()) return;

    const address = window.prompt('اكتب عنوان التوصيل:');
    if (!address || !address.trim()) return;

    let text = `طلب جديد من متجر الجرادي 🍎\n`;
    text += `الاسم: ${customer}\n`;
    text += `العنوان: ${address}\n\n`;
    text += `المنتجات:\n`;

    cart.forEach(item => {
      text += `${item.name} × ${item.quantity} = ${money(
        item.price * item.quantity
      )}\n`;
    });

    text += `\nالإجمالي: ${money(cartTotal)}`;
    text += '\n\nأرجو تأكيد الطلب.';

    const url =
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(text)}`;

    window.open(url, '_blank');
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' ||
      String(product.category_id) === String(categoryFilter);

    return matchesSearch && matchesCategory;
  });

  return (
    <div dir="rtl" className="app">

      <style>{`
        * { box-sizing: border-box; }

        body {
          margin: 0;
          font-family: Tahoma, Arial, sans-serif;
          background: #f4f7f2;
          color: #24352b;
        }

        .app { min-height: 100vh; }

        .header {
          background: #176b3a;
          color: white;
          padding: 28px 15px;
          text-align: center;
        }

        .header h1 {
          margin: 0 0 8px;
          font-size: 28px;
        }

        .header p { margin: 5px; }

        .container {
          width: 94%;
          max-width: 1100px;
          margin: 22px auto;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 18px;
        }

        .stat, .panel {
          background: white;
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 2px 8px #0000000b;
        }

        .stat { text-align: center; }

        .stat strong {
          display: block;
          font-size: 23px;
          color: #176b3a;
        }

        .panel { margin-bottom: 20px; }

        .panel h2 {
          color: #176b3a;
          font-size: 20px;
          margin-top: 0;
        }

        input, select, textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #d8e1d9;
          border-radius: 8px;
          font-family: inherit;
          font-size: 15px;
          margin-bottom: 10px;
          background: white;
          min-width: 0;
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        button {
          border: none;
          border-radius: 8px;
          padding: 12px 16px;
          font-family: inherit;
          font-size: 15px;
          cursor: pointer;
        }

        button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .primary {
          background: #176b3a;
          color: white;
          width: 100%;
        }

        .search { margin-bottom: 10px; }

        .products {
          display: grid;
          grid-template-columns: repeat(
            auto-fill, minmax(155px, 1fr)
          );
          gap: 13px;
        }

        .product {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #e5ebe5;
        }

        .product-image,
        .product-image-placeholder {
          width: 100%;
          height: 145px;
          object-fit: cover;
          background: #edf3ed;
        }

        .product-image-placeholder {
          display: grid;
          place-items: center;
          font-size: 45px;
        }

        .product-info { padding: 12px; }

        .product h3 {
          margin: 0 0 8px;
          font-size: 17px;
        }

        .price {
          color: #176b3a;
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 8px;
        }

        .description {
          color: #69766c;
          font-size: 13px;
        }

        .stock {
          font-size: 13px;
          color: #657368;
        }

        .add-cart {
          width: 100%;
          background: #176b3a;
          color: white;
          margin-top: 8px;
        }

        .delete {
          background: #fce8e8;
          color: #b42318;
          width: 100%;
          margin-top: 8px;
        }

        .cart-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          padding: 12px 0;
          border-bottom: 1px solid #eee;
        }

        .quantity {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .quantity button {
          background: #e7f3e9;
          color: #176b3a;
          padding: 7px 12px;
          font-weight: bold;
        }

        .total {
          font-size: 21px;
          font-weight: bold;
          color: #176b3a;
          margin: 15px 0;
        }

        .whatsapp {
          background: #168b50;
          color: white;
          width: 100%;
          font-size: 17px;
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

        .admin-toggle {
          background: #e7f3e9;
          color: #176b3a;
          width: 100%;
          margin-bottom: 15px;
        }

        .footer {
          text-align: center;
          padding: 25px;
          color: #718071;
        }

        @media(max-width: 600px) {
          .form-grid { grid-template-columns: 1fr; }
          .header h1 { font-size: 23px; }
          .products {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .stats { grid-template-columns: repeat(3, 1fr); }
          .stat { padding: 12px 5px; font-size: 12px; }
          .stat strong { font-size: 20px; }
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
            المنتجات
          </div>
          <div className="stat">
            <strong>{categories.length}</strong>
            الأقسام
          </div>
          <div className="stat">
            <strong>{cartCount}</strong>
            السلة 🛒
          </div>
        </div>

        {message && (
          <div className="message">{message}</div>
        )}

        <section className="panel">
          <h2>🔎 ابحث عن منتجاتك</h2>

          <input
            className="search"
            placeholder="ابحث عن منتج..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="all">جميع الأقسام</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </section>

        <section className="panel">
          <h2>🛒 منتجات متجر الجرادي</h2>

          {loading ? (
            <div className="empty">جارٍ تحميل المنتجات...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="empty">لا توجد منتجات حالياً</div>
          ) : (
            <div className="products">
              {filteredProducts.map(product => (
                <article className="product" key={product.id}>
                  <ProductImage product={product} />

                  <div className="product-info">
                    <h3>{product.name}</h3>

                    <div className="price">
                      {money(product.price)}
                    </div>

                    {product.description && (
                      <p className="description">
                        {product.description}
                      </p>
                    )}

                    <p className="stock">
                      المتوفر: {product.stock || 0}
                    </p>

                    <button
                      className="add-cart"
                      disabled={Number(product.stock || 0) <= 0}
                      onClick={() => addToCart(product)}
                    >
                      {Number(product.stock || 0) > 0
                        ? '➕ أضف إلى السلة'
                        : 'غير متوفر'}
                    </button>

                    {showAdmin && (
                      <button
                        className="delete"
                        onClick={() => deleteProduct(product.id)}
                      >
                        حذف المنتج
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel" id="cart">
          <h2>🛒 سلة المشتريات</h2>

          {cart.length === 0 ? (
            <div className="empty">
              السلة فارغة، اختر منتجاتك أولاً
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div className="cart-item" key={item.id}>
                  <div>
                    <strong>{item.name}</strong>
                    <div>{money(item.price * item.quantity)}</div>
                  </div>

                  <div className="quantity">
                    <button
                      onClick={() => changeQuantity(item.id, -1)}
                    >
                      −
                    </button>

                    <strong>{item.quantity}</strong>

                    <button
                      disabled={item.quantity >= Number(item.stock)}
                      onClick={() => changeQuantity(item.id, 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              <div className="total">
                الإجمالي: {money(cartTotal)}
              </div>

              <button
                className="whatsapp"
                onClick={checkout}
              >
                🟢 إتمام الطلب عبر واتساب
              </button>
            </>
          )}
        </section>

        <section className="panel">
          <button
            className="admin-toggle"
            onClick={() => setShowAdmin(!showAdmin)}
          >
            {showAdmin ? 'إخفاء إدارة المنتجات' : '⚙️ إدارة المنتجات'}
          </button>

          {showAdmin && (
            <>
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
                    placeholder="السعر"
                    value={form.price}
                    onChange={updateForm}
                    required
                  />

                  <input
                    name="stock"
                    type="number"
                    min="0"
                    placeholder="الكمية"
                    value={form.stock}
                    onChange={updateForm}
                  />

                  <select
                    name="category_id"
                    value={form.category_id}
                    onChange={updateForm}
                  >
                    <option value="">اختر القسم</option>
                    {categories.map(category => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>

                  <input
                    name="image_url"
                    placeholder="رابط صورة المنتج (اختياري)"
                    value={form.image_url}
                    onChange={updateForm}
                  />

                  <textarea
                    name="description"
                    placeholder="وصف المنتج"
                    value={form.description}
                    onChange={updateForm}
                  />
                </div>

                <button
                  className="primary"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? 'جارٍ الحفظ...' : 'حفظ المنتج'}
                </button>
              </form>
            </>
          )}
        </section>

      </main>

      <footer className="footer">
        جميع الحقوق محفوظة © متجر الجرادي للخضار والفواكه
        <p>للطلب والاستفسار: 775391755</p>
      </footer>

    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
