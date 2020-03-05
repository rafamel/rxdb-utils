import parseProperties from '~/select/parse-properties';

describe(`succeeds w/ strings`, () => {
  test(`1 element`, () => {
    expect(parseProperties(['a'])).toEqual({ a: {} });
  });
  test(`multiple elements`, () => {
    expect(parseProperties(['a', 'b', 'c'])).toEqual({ a: {}, b: {}, c: {} });
  });
  test(`1 nested`, () => {
    expect(parseProperties(['a.b.c'])).toEqual({ a: { b: { c: {} } } });
  });
  test(`multiple nested`, () => {
    expect(parseProperties(['a.b.c', 'a.c', 'b.c.d'])).toEqual({
      a: { b: { c: {} }, c: {} },
      b: { c: { d: {} } }
    });
  });
});

describe(`succeeds w/ objects`, () => {
  test(`just object`, () => {
    expect(parseProperties([{ a: { b: true, c: false }, b: true }])).toEqual({
      a: { b: {} },
      b: {}
    });
  });
  test(`mixed on array`, () => {
    expect(
      parseProperties([{ a: { b: true, c: true }, b: true }, 'd', 'b.c'])
    ).toEqual({
      a: { b: {}, c: {} },
      b: { c: {} },
      d: {}
    });
  });
  test(`mixed on array and object`, () => {
    expect(
      parseProperties([
        {
          a: { b: true, c: ['a.b', 'b', { d: true, e: 'd', f: 'a.b' }] },
          b: true
        },
        'd',
        'b.c',
        'a.d'
      ])
    ).toEqual({
      a: {
        b: {},
        c: {
          a: { b: {} },
          b: {},
          d: {},
          e: { d: {} },
          f: { a: { b: {} } }
        },
        d: {}
      },
      b: { c: {} },
      d: {}
    });
  });
});

describe(`fails`, () => {
  test(`fails when input is not array`, () => {
    expect(() => parseProperties('string')).toThrowError();
  });
  test(`fails when property is not string/object/array`, () => {
    expect(() => parseProperties([() => {}])).toThrowError();
  });
});
