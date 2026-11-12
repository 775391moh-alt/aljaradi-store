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
    return <div className="product-image-placeholder">🍎</div>;
  }

  return (
    <img
      className="product-image"
      src={src}
      alt={product.name}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [session, setSession] = useState(null);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [message, setMessage] = useState('');
  const [showLogin, setShowLogin] = useState(false);
  const [view, setView] = useState(window.location.hash === '#/admin/login' ? 'admin-login' : 'store');
  const [customerDetails, setCustomerDetails] = useState({ name: '', phone: '', address: '', landmark: '', notes: '' });
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [newCategory, setNewCategory] = useState('');

  const defaultStoreSettings = {
    storeName: 'متجر الجرادي للخضار والفواكه',
    welcomeMessage: 'أهلاً وسهلاً بكم في متجر الجرادي، يسعدنا خدمتكم وتوصيل طلباتكم إلى باب المنزل.',
    storeOpen: true,
    promoEnabled: false,
    promoTitle: 'عروض متجر الجرادي',
    promoText: '',
    announcementEnabled: false,
    announcementText: '',
    deliveryBanner: '🚚 التوصيل مجاناً داخل محافظة حجة وبرسوم رمزية خارج المحافظة'
  };

  const [storeSettings, setStoreSettings] = useState(defaultStoreSettings);

  const isAdmin = session?.user?.id === ADMIN_UID;

  function navigate(nextView) {
    setView(nextView);
    window.history.replaceState(null, '', nextView === 'admin-login' ? '#/admin/login' : '#/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const [form, setForm] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    image_url: '',
    category_id: ''
  });

  const money = (value) =>
    Number(value || 0).toLocaleString('en-US') + ' ر.ي';

  async function loadData() {
    setLoading(true);

    try {
      const [productsResult, categoriesResult] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
          .from('categories')
          .select('*')
          .order('name', { ascending: true })
      ]);

      if (productsResult.error) {
        setMessage('خطأ تحميل المنتجات: ' + productsResult.error.message);
      } else {
        setProducts(productsResult.data || []);
      }

      if (categoriesResult.error) {
        setMessage('خطأ تحميل الأقسام: ' + categoriesResult.error.message);
      } else {
        setCategories(categoriesResult.data || []);
      }

      const settingsResult = await supabase
        .from('store_settings')
        .select('settings')
        .eq('id', 1)
        .maybeSingle();

      if (!settingsResult.error && settingsResult.data?.settings) {
        setStoreSettings({ ...defaultStoreSettings, ...settingsResult.data.settings });
      } else if (settingsResult.error) {
        console.warn('تعذر تحميل إعدادات المتجر:', settingsResult.error.message);
      }
    } catch (error) {
      setMessage('حدث خطأ أثناء تحميل بيانات المتجر: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setMessage('تعذر التحقق من جلسة الدخول: ' + error.message);
        return;
      }
      setSession(data.session);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return;
      setSession(newSession);
      if (newSession?.user?.id !== ADMIN_UID) {
        setShowLogin(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  async function adminLogin(event) {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: adminEmail.trim(),
        password: adminPassword
      });

      if (error) {
        setMessage('فشل تسجيل الدخول: ' + error.message);
        return;
      }

      if (data.user?.id !== ADMIN_UID) {
        await supabase.auth.signOut();
        setSession(null);
        setMessage('هذا الحساب ليس حساب المدير المعتمد');
        return;
      }

      setSession(data.session);
      setAdminPassword('');
      setShowLogin(false);
      navigate('store');
      setMessage('تم تسجيل دخول المدير بنجاح');
    } catch (error) {
      setMessage('حدث خطأ أثناء تسجيل الدخول: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function adminLogout() {
    setSaving(true);
    const { error } = await supabase.auth.signOut();
    setSaving(false);

    if (error) {
      setMessage('تعذر تسجيل الخروج: ' + error.message);
      return;
    }

    setSession(null);
    setShowLogin(false);
    navigate('store');
    setMessage('تم تسجيل الخروج');
  }

  async function saveStoreSettings(event) {
    event.preventDefault();

    if (!isAdmin) {
      setMessage('هذه الإعدادات متاحة للمدير فقط');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase.from('store_settings').upsert(
        [{
          id: 1,
          setting_key: 'store_config',
          setting_value: 'active',
          settings: storeSettings,
          updated_at: new Date().toISOString()
        }],
        { onConflict: 'id' }
      );

      if (error) {
        setMessage('تعذر حفظ إعدادات المتجر: ' + error.message);
        return;
      }

      setMessage('تم حفظ إعدادات المتجر بنجاح');
    } catch (error) {
      setMessage('حدث خطأ أثناء حفظ الإعدادات: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  function updateStoreSetting(name, value) {
    setStoreSettings((current) => ({ ...current, [name]: value }));
  }

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function addProduct(event) {
    event.preventDefault();

    if (!isAdmin) {
      setMessage('يجب تسجيل الدخول بحساب المدير أولاً');
      return;
    }

    if (Number(form.price) < 0 || Number(form.stock || 0) < 0) {
      setMessage('السعر والكمية لا يمكن أن يكونا أقل من صفر');
      return;
    }

    setSaving(true);
    setMessage('');

    const product = {
      name: form.name.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      stock: Number(form.stock || 0),
      image_url: form.image_url.trim() || null,
      category_id: form.category_id ? Number(form.category_id) : null
    };

    try {
      const { error } = await supabase.from('products').insert([product]);

      if (error) {
        setMessage('تعذرت إضافة المنتج: ' + error.message);
        return;
      }

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
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id) {
    if (!isAdmin) {
      setMessage('غير مسموح: هذه العملية للمدير فقط');
      return;
    }

    if (!window.confirm('هل تريد حذف هذا المنتج؟')) return;

    setSaving(true);
    const { error } = await supabase.from('products').delete().eq('id', id);
    setSaving(false);

    if (error) {
      setMessage('تعذر حذف المنتج: ' + error.message);
      return;
    }

    setCart((current) => current.filter((item) => item.id !== id));
    setMessage('تم حذف المنتج');
    await loadData();
  }

  async function addCategory(event) {
    event.preventDefault();

    if (!isAdmin) {
      setMessage('يجب تسجيل الدخول بحساب المدير أولاً');
      return;
    }

    const name = newCategory.trim();
    if (!name) return;

    setSaving(true);
    const { error } = await supabase.from('categories').insert([{ name }]);
    setSaving(false);

    if (error) {
      setMessage('تعذرت إضافة القسم: ' + error.message);
      return;
    }

    setNewCategory('');
    setMessage('تمت إضافة القسم بنجاح');
    await loadData();
  }

  async function deleteCategory(id) {
    if (!isAdmin) {
      setMessage('غير مسموح: هذه العملية للمدير فقط');
      return;
    }

    if (!window.confirm('هل تريد حذف هذا القسم؟')) return;

    setSaving(true);
    const { error } = await supabase.from('categories').delete().eq('id', id);
    setSaving(false);

    if (error) {
      setMessage(
        'تعذر حذف القسم. قد يكون مرتبطاً بمنتجات موجودة. التفاصيل: ' +
        error.message
      );
      return;
    }

    if (String(categoryFilter) === String(id)) {
      setCategoryFilter('all');
    }

    setMessage('تم حذف القسم');
    await loadData();
  }

  function addToCart(product) {
    if (Number(product.stock || 0) <= 0) {
      setMessage('عذراً، المنتج غير متوفر حالياً');
      return;
    }

    setCart((current) => {
      const found = current.find((item) => item.id === product.id);

      if (found) {
        return current.map((item) =>
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

      return [...current, { ...product, quantity: 1 }];
    });

    setMessage('تمت إضافة ' + product.name + ' إلى السلة');
  }

  function changeQuantity(id, amount) {
    setCart((current) =>
      current
        .map((item) =>
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
        )
        .filter((item) => item.quantity > 0)
    );
  }

  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * item.quantity,
    0
  );

  function updateCustomerDetails(event) {
    const { name, value } = event.target;
    setCustomerDetails((current) => ({ ...current, [name]: value }));
  }

  function checkout(event) {
    event.preventDefault();
    if (!storeSettings.storeOpen) {
      setMessage('المتجر مغلق حالياً، نعتذر عن استقبال الطلبات.');
      return;
    }
    if (!cart.length) {
      setMessage('السلة فارغة، أضف المنتجات أولاً');
      return;
    }

    const { name, phone, address, landmark, notes } = customerDetails;
    if (!name.trim() || !phone.trim() || !address.trim() || !landmark.trim()) {
      setMessage('يرجى تعبئة الاسم ورقم الهاتف والعنوان وأقرب معلم');
      return;
    }

    let orderText = 'طلب جديد من متجر الجرادي 🍎\n';
    orderText += `الاسم: ${name.trim()}\n`;
    orderText += `رقم الهاتف: ${phone.trim()}\n`;
    orderText += `عنوان التوصيل: ${address.trim()}\n`;
    orderText += `أقرب معلم: ${landmark.trim()}\n`;
    if (notes.trim()) orderText += `ملاحظات: ${notes.trim()}\n`;
    orderText += '\nالمنتجات:\n';

    cart.forEach((item) => {
      orderText += `${item.name} × ${item.quantity} = ${money(Number(item.price) * item.quantity)}\n`;
    });
    orderText += `\nالإجمالي: ${money(cartTotal)}\n\nأرجو تأكيد الطلب.`;

    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(orderText)}`;
    // الانتقال من نفس الصفحة يساعد متصفح الهاتف على تسليم الرابط لتطبيق واتساب المثبت.
    window.location.href = url;
  }

  const filteredProducts = products.filter((product) => {
    const searchableText = `${product.name || ''} ${product.description || ''}`.toLocaleLowerCase('ar').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
    const searchText = search.trim().toLocaleLowerCase('ar').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه');
    const matchesSearch = searchableText.includes(searchText);
    const matchesCategory =
      categoryFilter === 'all' ||
      String(product.category_id) === String(categoryFilter);

    return matchesSearch && matchesCategory;
  });

  if (view === 'admin-login' && !isAdmin) {
    return (
      <div dir="rtl" className="app login-page">
        <style>{`body{margin:0;background:#f4f7f2;font-family:Tahoma,Arial,sans-serif;color:#24352b}.login-page{min-height:100vh;display:grid;place-items:center;padding:20px}.login-card{width:min(100%,430px);background:#fff;border-radius:18px;padding:25px;box-shadow:0 12px 40px #153f2b18}.login-logo{font-size:42px;text-align:center}.login-card h1{text-align:center;color:#176b3a;margin:8px 0}.login-card p{text-align:center;color:#657368}.login-card input{width:100%;padding:13px;border:1px solid #d8e1d9;border-radius:9px;margin:8px 0;font:inherit}.login-card button{width:100%;padding:13px;border:0;border-radius:9px;background:#176b3a;color:#fff;font:inherit;margin-top:8px}.login-card .back{background:#edf5ed;color:#176b3a}.login-error{color:#b42318;background:#fff0f0;padding:10px;border-radius:8px;margin:10px 0}`}</style>
        <section className="login-card">
          <div className="login-logo">🥬</div>
          <h1>إدارة متجر الجرادي</h1>
          <p>تسجيل دخول المدير</p>
          {message && <div className="login-error" role="alert">{message}</div>}
          <form onSubmit={adminLogin}>
            <input type="email" placeholder="البريد الإلكتروني" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} autoComplete="username" required />
            <input type="password" placeholder="كلمة المرور" value={adminPassword} onChange={(event) => setAdminPassword(event.target.value)} autoComplete="current-password" required />
            <button type="submit" disabled={saving}>{saving ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}</button>
          </form>
          <button className="back" type="button" onClick={() => navigate('store')}>العودة إلى المتجر</button>
        </section>
      </div>
    );
  }

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

        button, input, select, textarea { font-family: inherit; }
        .app { min-height: 100vh; }

        .header {
          background: linear-gradient(135deg, #124d31, #21834b 58%, #70a83c);
          color: white;
          padding: 18px 4%;
          box-shadow: 0 5px 20px #174b3026;
        }
        .header-top {
          max-width: 1160px;
          margin: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          gap: 14px;
        }
        .brand { display: flex; align-items: center; justify-content: center; gap: 12px; text-align: center; }
        .brand-mark {
          width: 58px; height: 58px; border-radius: 18px;
          display: grid; place-items: center; font-size: 34px;
          background: #ffffff20; border: 1px solid #ffffff55;
          box-shadow: inset 0 0 15px #ffffff20;
        }
        .brand h1 { margin: 0 0 4px; font-size: 25px; }
        .brand p { margin: 0; color: #e5f5e8; font-size: 13px; }
        .header-actions { display: flex; align-items: center; gap: 8px; position: absolute; left: 0; top: 50%; transform: translateY(-50%); }
        .header-admin, .header-cart {
          color: #174b30; background: #fff; font-weight: bold;
          padding: 10px 14px; white-space: nowrap;
        }
        .hero-copy { max-width: 1160px; margin: 18px auto 0; text-align: center; }
        .hero-copy h2 { margin: 0 0 7px; font-size: 21px; }
        .hero-copy p { margin: 0; color: #e5f5e8; }
        .delivery-banner {
          max-width: 1160px; margin: 15px auto 0; padding: 11px 15px;
          border-radius: 12px; text-align: center; color: #23452d;
          background: linear-gradient(90deg, #f5e9b6, #fff8dc, #f5e9b6);
          font-weight: bold; box-shadow: 0 3px 12px #00000012;
        }

        .container { width: 94%; max-width: 1160px; margin: 22px auto; }
        .category-chips { display: flex; gap: 9px; overflow-x: auto; padding: 3px 1px 12px; }
        .category-chip {
                  border: 1px solid #dce8dc; background: #fff; color: #355440;
          border-radius: 30px; padding: 9px 16px; white-space: nowrap;
          cursor: pointer; font-weight: bold;
        }
        .category-chip.active { background: #176b3a; color: #fff; border-color: #176b3a; }

        .search-row { display: flex; gap: 10px; margin: 12px 0 18px; }
        .search-input {
          flex: 1; min-width: 0; border: 1px solid #d7e2d7;
          border-radius: 12px; padding: 13px 15px; background: #fff;
          font-size: 15px; outline-color: #4a9b60;
        }

        .section-title {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; margin: 22px 0 14px;
        }
        .section-title h2 { margin: 0; font-size: 20px; color: #245a36; }
        .section-title span { color: #728074; font-size: 13px; }

        .product-grid {
          display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .product-card {
          background: #fff; border: 1px solid #e1e9df; border-radius: 15px;
          overflow: hidden; box-shadow: 0 4px 15px #1b4b2b0a;
          min-width: 0;
        }
        .product-image, .product-image-placeholder {
          width: 100%; height: 145px; object-fit: cover; display: grid;
          place-items: center; background: #edf4eb; font-size: 42px;
        }
        .product-info { padding: 11px; }
        .product-info h3 { font-size: 15px; margin: 0 0 6px; color: #254d31; }
        .product-description {
          color: #788379; font-size: 12px; line-height: 1.6;
          min-height: 36px; margin: 0 0 8px;
        }
        .product-price { color: #176b3a; font-weight: bold; font-size: 16px; }
        .product-stock { font-size: 11px; color: #778277; margin: 5px 0 9px; }
        .product-actions { display: flex; align-items: center; gap: 5px; }
        .product-actions button {
          border: 0; border-radius: 8px; padding: 8px 9px;
          background: #176b3a; color: white; cursor: pointer;
          font-weight: bold; font-size: 12px;
        }
        .product-actions button:disabled { opacity: .45; cursor: not-allowed; }
        .product-actions .qty-btn {
          background: #edf5ed; color: #176b3a; min-width: 27px; padding: 7px 5px;
        }
        .product-actions .qty-number { min-width: 16px; text-align: center; font-size: 12px; }

        .promo-box {
          border-radius: 15px; padding: 17px; margin: 18px 0;
          background: linear-gradient(120deg, #fff1c5, #fff9e9);
          border: 1px solid #f0dfad; color: #624d18;
        }
        .promo-box h3 { margin: 0 0 7px; }
        .promo-box p { margin: 0; line-height: 1.7; }

        .announcement {
          background: #e8f3ff; color: #1e4e78; border: 1px solid #c8e0f6;
          border-radius: 12px; padding: 13px 16px; margin: 14px 0;
          line-height: 1.7;
        }
        .closed-banner {
          background: #fff0f0; color: #a52b2b; border: 1px solid #f1caca;
          border-radius: 12px; padding: 13px; margin: 14px 0; text-align: center;
          font-weight: bold;
        }

        .panel {
          background: #fff; border: 1px solid #e0e8df; border-radius: 16px;
          padding: 18px; margin: 20px 0; box-shadow: 0 4px 18px #1b4b2b08;
        }
        .panel h2, .panel h3 { color: #245a36; margin-top: 0; }
        .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
        .field.full { grid-column: 1 / -1; }
        .field label { font-size: 13px; font-weight: bold; color: #435c49; }
        .field input, .field select, .field textarea {
          width: 100%; border: 1px solid #d8e2d7; border-radius: 9px;
          padding: 11px 12px; background: #fff; outline-color: #4a9b60;
          font-size: 14px; min-width: 0;
        }
        .field textarea { resize: vertical; min-height: 78px; }
        .btn {
          border: 0; border-radius: 9px; padding: 11px 16px;
          cursor: pointer; font-weight: bold; font-size: 14px;
          background: #176b3a; color: #fff;
        }
        .btn.secondary { background: #edf5ed; color: #176b3a; }
        .btn.danger { background: #b83b3b; color: #fff; }
        .btn:disabled { opacity: .55; cursor: not-allowed; }
        .button-row { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
        .message {
          padding: 12px 15px; margin: 15px 0; border-radius: 10px;
          background: #e8f5e9; color: #21623a; line-height: 1.6;
        }
        .empty-state {
          text-align: center; padding: 35px 15px; background: #fff;
          border: 1px dashed #cbdacb; border-radius: 14px; color: #718073;
        }

        .cart-list { display: flex; flex-direction: column; gap: 10px; }
        .cart-item {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; border-bottom: 1px solid #edf0ec; padding: 10px 0;
        }
        .cart-item-info { min-width: 0; }
        .cart-item-info strong { display: block; color: #31553a; }
        .cart-item-info small { color: #778277; }
        .cart-controls { display: flex; align-items: center; gap: 7px; }
        .cart-controls button {
          border: 0; border-radius: 7px; background: #edf5ed;
          color: #176b3a; padding: 6px 10px; font-weight: bold;
        }
        .cart-total {
          display: flex; justify-content: space-between; gap: 10px;
          border-top: 2px solid #e5ece3; margin-top: 12px; padding-top: 14px;
          color: #176b3a; font-size: 18px; font-weight: bold;
        }
        .admin-product-row {
          display: flex; justify-content: space-between; align-items: center;
          gap: 10px; padding: 10px 0; border-bottom: 1px solid #edf0ec;
        }
        .admin-product-row small { color: #788379; display: block; margin-top: 4px; }
        .toggle-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; padding: 12px 0; border-bottom: 1px solid #edf0ec;
        }
        .toggle-row input { width: 20px; height: 20px; accent-color: #176b3a; }
        .footer {
          background: #153e29; color: #e8f3e9; padding: 25px 5%;
          text-align: center; margin-top: 35px; line-height: 1.9;
        }
        .footer strong { font-size: 18px; }
        .footer a { color: #fff; text-decoration: none; }
        .loading { text-align: center; padding: 35px; color: #607365; }

        @media (max-width: 600px) {
          .header { padding: 14px 3%; }
          .header-top { min-height: 58px; }
          .brand { gap: 7px; }
          .brand-mark { width: 43px; height: 43px; border-radius: 13px; font-size: 26px; }
          .brand h1 { font-size: 17px; }
          .brand p { font-size: 10px; }
          .header-actions { gap: 5px; }
          .header-admin, .header-cart { padding: 8px 9px; font-size: 11px; }
          .hero-copy h2 { font-size: 17px; }
          .hero-copy p { font-size: 12px; }
          .delivery-banner { font-size: 12px; padding: 9px; }
          .container { width: 94%; margin: 16px auto; }
          .product-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
          .product-image, .product-image-placeholder { height: 100px; }
          .product-info { padding: 7px; }
          .product-info h3 { font-size: 12px; }
          .product-description { font-size: 10px; min-height: 31px; }
          .product-price { font-size: 12px; }
          .product-stock { font-size: 9px; }
          .product-actions { gap: 3px; flex-wrap: wrap; }
          .product-actions button { font-size: 10px; padding: 6px 5px; }
          .product-actions .qty-btn { min-width: 22px; }
          .form-grid { grid-template-columns: 1fr; }
          .field.full { grid-column: auto; }
          .panel { padding: 13px; }
        }

        @media (max-width: 360px) {
          .header-actions { position: static; transform: none; }
          .header-top { flex-wrap: wrap; }
          .brand h1 { font-size: 15px; }
          .product-grid { gap: 6px; }
          .product-actions button { padding: 5px 4px; }
        }
      `}</style>

      <header className="header">
        <div className="header-top">
          <div className="brand">
            <div className="brand-mark">🥬</div>
            <div>
              <h1>الجرادي للخضار والفواكه</h1>
              <p>جودة عالية وأسعار مناسبة</p>
            </div>
          </div>
          <div className="header-actions">
            <button className="btn header-admin" type="button" onClick={() => isAdmin ? document.getElementById('admin-panel')?.scrollIntoView({ behavior: 'smooth' }) : navigate('admin-login')}>
              {isAdmin ? 'الإدارة' : 'دخول الإدارة'}
            </button>
            <button className="btn header-cart" type="button" onClick={() => document.getElementById('cart-panel')?.scrollIntoView({ behavior: 'smooth' })}>
              🛒 {cartCount}
            </button>
          </div>
        </div>

        <div className="hero-copy">
          <h2>كل ما تحتاج إليه نوصله إلى باب بيتك</h2>
          <p>خضروات وفواكه طازجة كل يوم</p>
        </div>

        <div className="delivery-banner">{storeSettings.deliveryBanner}</div>
      </header>

      <main className="container">
        {message && <div className="message" role="status">{message}</div>}

        {!storeSettings.storeOpen && (
          <div className="closed-banner">🔒 المتجر مغلق حالياً، لا نستقبل الطلبات في الوقت الحالي.</div>
        )}

        {storeSettings.announcementEnabled && storeSettings.announcementText && (
          <div className="announcement">📢 {storeSettings.announcementText}</div>
        )}

        {storeSettings.promoEnabled && (storeSettings.promoTitle || storeSettings.promoText) && (
          <div className="promo-box">
            <h3>🎉 {storeSettings.promoTitle}</h3>
            <p>{storeSettings.promoText}</p>
          </div>
        )}

        {loading ? (
          <div className="loading">جارٍ تحميل المنتجات والأقسام...</div>
        ) : (
          <>
            <div className="section-title">
              <h2>منتجاتنا الطازجة</h2>
              <span>{filteredProducts.length} منتج</span>
            </div>

            <div className="search-row">
              <input
                className="search-input"
                type="search"
                placeholder="ابحث عن منتج أو وصفه..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="category-chips">
              <button className={`category-chip ${categoryFilter === 'all' ? 'active' : ''}`} onClick={() => setCategoryFilter('all')}>كل المنتجات</button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`category-chip ${String(categoryFilter) === String(category.id) ? 'active' : ''}`}
                  onClick={() => setCategoryFilter(String(category.id))}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {filteredProducts.length ? (
              <div className="product-grid">
                {filteredProducts.map((product) => {
                  const cartItem = cart.find((item) => item.id === product.id);
                  const quantity = cartItem?.quantity || 0;

                  return (
                    <article className="product-card" key={product.id}>
                      <ProductImage product={product} />
                      <div className="product-info">
                        <h3>{product.name}</h3>
                        <p className="product-description">{product.description || 'منتج طازج من متجر الجرادي'}</p>
                        <div className="product-price">{money(product.price)}</div>
                        <div className="product-stock">
                          {Number(product.stock || 0) > 0 ? `المتوفر: ${product.stock}` : 'غير متوفر حالياً'}
                        </div>
                        <div className="product-actions">
                          <button
                            className="qty-btn"
                            type="button"
                            disabled={quantity <= 0}
                            onClick={() => changeQuantity(product.id, -1)}
                            aria-label="تقليل الكمية"
                          >−</button>
                          <span className="qty-number">{quantity}</span>
                          <button
                            className="qty-btn"
                            type="button"
                            disabled={quantity >= Number(product.stock || 0)}
                            onClick={() => addToCart(product)}
                            aria-label="زيادة الكمية"
                          >+</button>
                          <button
                            type="button"
                            disabled={Number(product.stock || 0) <= 0 || !storeSettings.storeOpen}
                            onClick={() => addToCart(product)}
                          >أضف للسلة</button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">لا توجد منتجات مطابقة للبحث حالياً.</div>
            )}
          </>
        )}
                </section>

        <section className="panel" id="cart">
          <h2>🛒 سلة المشتريات</h2>

          {cart.length === 0 ? (
            <div className="empty-state">
              السلة فارغة، اختر منتجاتك أولاً
            </div>
          ) : (
            <>
              {cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-info">
                    <strong>{item.name}</strong>
                    <div>{money(Number(item.price) * item.quantity)}</div>
                  </div>

                  <div className="quantity">
                    <button
                      type="button"
                      onClick={() => changeQuantity(item.id, -1)}
                    >−</button>

                    <strong>{item.quantity}</strong>

                    <button
                      type="button"
                      disabled={item.quantity >= Number(item.stock || 0)}
                      onClick={() => changeQuantity(item.id, 1)}
                    >+</button>
                  </div>
                </div>
              ))}

              <div className="total">
                الإجمالي: {money(cartTotal)}
              </div>

              <h3>بيانات التوصيل</h3>

              <form onSubmit={checkout} className="checkout-form">
                <div className="form-grid">
                  <input
                    name="name"
                    value={customerDetails.name}
                    onChange={updateCustomerDetails}
                    placeholder="الاسم الكامل"
                    required
                  />

                  <input
                    name="phone"
                    type="tel"
                    value={customerDetails.phone}
                    onChange={updateCustomerDetails}
                    placeholder="رقم الهاتف"
                    required
                  />

                  <input
                    name="address"
                    value={customerDetails.address}
                    onChange={updateCustomerDetails}
                    placeholder="عنوان التوصيل بالتفصيل"
                    required
                  />

                  <input
                    name="landmark"
                    value={customerDetails.landmark}
                    onChange={updateCustomerDetails}
                    placeholder="أقرب معلم"
                    required
                  />
                </div>

                <textarea
                  name="notes"
                  value={customerDetails.notes}
                  onChange={updateCustomerDetails}
                  placeholder="ملاحظات إضافية (اختياري)"
                />

                <button
                  className="whatsapp"
                  type="submit"
                  disabled={!storeSettings.storeOpen || cart.length === 0}
                >
                  🟢 إرسال الطلب إلى واتساب
                </button>
              </form>
            </>
          )}
        </section>
      </main>

      <footer className="footer">
        <strong>متجر الجرادي للخضار والفواكه</strong>
        <p>📍 مدينة حجة، مبنى نقابة السائقين، جوار محطة البنزين</p>
        <p>للطلب والاستفسار: 775391755</p>
        <a
          href={`https://wa.me/967775391755`}
          target="_blank"
          rel="noreferrer"
        >
          تواصل معنا عبر واتساب
        </a>
        <p>جميع الحقوق محفوظة © متجر الجرادي</p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
